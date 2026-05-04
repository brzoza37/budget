<?php

namespace App\Tests\Integration\Repository;

use App\Entity\Account;
use App\Entity\Category;
use App\Entity\Transaction;
use App\Entity\User;
use App\Repository\TransactionRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class TransactionRepositoryTest extends KernelTestCase
{
    private EntityManagerInterface $em;
    private TransactionRepository $repo;

    protected function setUp(): void
    {
        $kernel = self::bootKernel();
        /** @var EntityManagerInterface $em */
        $em = $kernel->getContainer()->get('doctrine.orm.entity_manager');
        $this->em = $em;
        /** @var TransactionRepository $repo */
        $repo = static::getContainer()->get(TransactionRepository::class);
        $this->repo = $repo;

        $this->em->getConnection()->executeStatement('DELETE FROM transaction');
        $this->em->getConnection()->executeStatement('DELETE FROM category');
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

    private function createAccount(User $user, string $currency = 'USD'): Account
    {
        $account = (new Account())->setName('Test')->setType('CHECKING')->setCurrency($currency)->setBalance(0.0)->setColor('#000')->setIcon('bank')->setUser($user);
        $this->em->persist($account);
        return $account;
    }

    private function createTransaction(User $user, Account $account, string $type, float $amount, string $date, ?Category $category = null): void
    {
        $tx = (new Transaction())->setType($type)->setAmount($amount)->setAccount($account)->setDate(new \DateTimeImmutable($date))->setUser($user);
        if ($category !== null) {
            $tx->setCategory($category);
        }
        $this->em->persist($tx);
    }

    public function testMonthlyIncomeOnlyCurrentMonth(): void
    {
        $user = $this->createUser();
        $account = $this->createAccount($user);
        $this->createTransaction($user, $account, 'INCOME', 500.0, '2026-05-15');
        $this->createTransaction($user, $account, 'INCOME', 200.0, '2026-04-15');
        $this->em->flush();

        $result = $this->repo->getMonthlyTotal('INCOME', 5, 2026, $user);

        $this->assertEqualsWithDelta(500.0, $result, 0.01);
    }

    public function testMonthlyExpenseExcludesIncome(): void
    {
        $user = $this->createUser();
        $account = $this->createAccount($user);
        $this->createTransaction($user, $account, 'INCOME', 500.0, '2026-05-15');
        $this->createTransaction($user, $account, 'EXPENSE', 150.0, '2026-05-10');
        $this->em->flush();

        $result = $this->repo->getMonthlyTotal('EXPENSE', 5, 2026, $user);

        $this->assertEqualsWithDelta(150.0, $result, 0.01);
    }

    public function testMonthlyTotalEmptyIsZero(): void
    {
        $user = $this->createUser();
        $this->em->flush();

        $result = $this->repo->getMonthlyTotal('INCOME', 5, 2026, $user);

        $this->assertEqualsWithDelta(0.0, $result, 0.01);
    }

    public function testSpentForBudgetScopedToCategory(): void
    {
        $user = $this->createUser();
        $account = $this->createAccount($user);

        $foodCat = (new Category())->setName('Food')->setType('EXPENSE')->setUser($user);
        $rentCat = (new Category())->setName('Rent')->setType('EXPENSE')->setUser($user);
        $this->em->persist($foodCat);
        $this->em->persist($rentCat);

        $this->createTransaction($user, $account, 'EXPENSE', 200.0, '2026-05-10', $foodCat);
        $this->createTransaction($user, $account, 'EXPENSE', 800.0, '2026-05-15', $rentCat);
        $this->em->flush();

        $result = $this->repo->getSpentForBudget((int) $foodCat->getId(), 5, 2026, $user);

        $this->assertEqualsWithDelta(200.0, $result, 0.01);
    }

    public function testSpentForBudgetScopedToMonth(): void
    {
        $user = $this->createUser();
        $account = $this->createAccount($user);

        $cat = (new Category())->setName('Food')->setType('EXPENSE')->setUser($user);
        $this->em->persist($cat);

        $this->createTransaction($user, $account, 'EXPENSE', 100.0, '2026-05-10', $cat);
        $this->createTransaction($user, $account, 'EXPENSE', 400.0, '2026-04-10', $cat);
        $this->em->flush();

        $result = $this->repo->getSpentForBudget((int) $cat->getId(), 5, 2026, $user);

        $this->assertEqualsWithDelta(100.0, $result, 0.01);
    }
}
