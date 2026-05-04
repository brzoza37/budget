<?php

namespace App\Tests\Integration\Repository;

use App\Entity\Account;
use App\Entity\ExchangeRate;
use App\Entity\User;
use App\Repository\AccountRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class AccountRepositoryTest extends KernelTestCase
{
    private EntityManagerInterface $em;
    private AccountRepository $repo;

    protected function setUp(): void
    {
        $kernel = self::bootKernel();
        /** @var EntityManagerInterface $em */
        $em = $kernel->getContainer()->get('doctrine.orm.entity_manager');
        $this->em = $em;
        /** @var AccountRepository $repo */
        $repo = static::getContainer()->get(AccountRepository::class);
        $this->repo = $repo;

        $this->em->getConnection()->executeStatement('DELETE FROM transaction');
        $this->em->getConnection()->executeStatement('DELETE FROM account');
        $this->em->getConnection()->executeStatement('DELETE FROM exchange_rate');
        $this->em->getConnection()->executeStatement('DELETE FROM "user"');
    }

    private function createUser(string $currency = 'USD'): User
    {
        $user = (new User())->setEmail('test@example.com')->setDisplayName('Test')->setPassword('x')->setCurrency($currency);
        $this->em->persist($user);
        return $user;
    }

    private function createAccount(User $user, string $currency, float $balance, bool $archived = false): Account
    {
        $account = (new Account())
            ->setName('Test')
            ->setType('CHECKING')
            ->setCurrency($currency)
            ->setBalance($balance)
            ->setColor('#000')
            ->setIcon('bank')
            ->setIsArchived($archived)
            ->setUser($user);
        $this->em->persist($account);
        return $account;
    }

    public function testSingleCurrencyTotal(): void
    {
        $user = $this->createUser('USD');
        $this->createAccount($user, 'USD', 300.0);
        $this->createAccount($user, 'USD', 200.0);
        $this->em->flush();

        $result = $this->repo->getTotalBalance($user);

        $this->assertEqualsWithDelta(500.0, $result['total'], 0.01);
        $this->assertSame([], $result['missingCurrencies']);
    }

    public function testMultiCurrencyConverted(): void
    {
        $user = $this->createUser('USD');
        $this->createAccount($user, 'USD', 500.0);
        $this->createAccount($user, 'EUR', 100.0);

        $er = (new ExchangeRate())->setTargetCurrency('USD')->setRate(1.08)->setFetchedAt(new \DateTimeImmutable());
        $this->em->persist($er);
        $this->em->flush();

        $result = $this->repo->getTotalBalance($user);

        // 500 USD + 100 EUR * 1.08 = 608 USD
        $this->assertEqualsWithDelta(608.0, $result['total'], 0.01);
        $this->assertSame([], $result['missingCurrencies']);
    }

    public function testArchivedAccountExcluded(): void
    {
        $user = $this->createUser('USD');
        $this->createAccount($user, 'USD', 500.0);
        $this->createAccount($user, 'USD', 1000.0, archived: true);
        $this->em->flush();

        $result = $this->repo->getTotalBalance($user);

        $this->assertEqualsWithDelta(500.0, $result['total'], 0.01);
    }

    public function testMissingRateReported(): void
    {
        $user = $this->createUser('USD');
        $this->createAccount($user, 'GBP', 200.0);
        $this->em->flush();

        $result = $this->repo->getTotalBalance($user);

        $this->assertContains('GBP', $result['missingCurrencies']);
        $this->assertEqualsWithDelta(0.0, $result['total'], 0.01);
    }
}
