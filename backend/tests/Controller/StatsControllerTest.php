<?php

namespace App\Tests\Controller;

use App\Entity\Account;
use App\Entity\ExchangeRate;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class StatsControllerTest extends WebTestCase
{
    private const VALID_PASSWORD = 'Secret123!@#';

    protected function setUp(): void
    {
        parent::setUp();
        static::ensureKernelShutdown();
        $kernel = static::bootKernel();
        $em = $kernel->getContainer()->get('doctrine.orm.entity_manager');
        $em->getConnection()->executeStatement('DELETE FROM transaction');
        $em->getConnection()->executeStatement('DELETE FROM account');
        $em->getConnection()->executeStatement('DELETE FROM exchange_rate');
        $em->getConnection()->executeStatement('DELETE FROM "user"');
        static::ensureKernelShutdown();
    }

    private function registerAndGetToken(object $client): array
    {
        $client->request('POST', '/api/auth/register', [], [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['email' => 'stats@example.com', 'password' => self::VALID_PASSWORD, 'displayName' => 'Stats'])
        );
        $data = json_decode($client->getResponse()->getContent(), true);
        return [$data['token'], $data['user']['id']];
    }

    public function testTotalBalanceSingleCurrency(): void
    {
        $client = static::createClient();
        [$token, $userId] = $this->registerAndGetToken($client);

        $em = static::getContainer()->get('doctrine.orm.entity_manager');
        $user = $em->getRepository(User::class)->find($userId);

        $a1 = (new Account())->setName('A1')->setType('CHECKING')->setCurrency('USD')->setBalance(500.0)->setColor('#000')->setIcon('bank')->setUser($user);
        $a2 = (new Account())->setName('A2')->setType('SAVINGS')->setCurrency('USD')->setBalance(300.0)->setColor('#000')->setIcon('bank')->setUser($user);
        $em->persist($a1);
        $em->persist($a2);
        $em->flush();

        $client->request('GET', '/api/stats/summary?year=2026&month=5', [], [], ['HTTP_AUTHORIZATION' => "Bearer $token"]);
        $this->assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertEqualsWithDelta(800.0, $data['totalBalance'], 0.01);
        $this->assertSame([], $data['missingRates']);
    }

    public function testTotalBalanceMultiCurrency(): void
    {
        $client = static::createClient();
        [$token, $userId] = $this->registerAndGetToken($client);

        $em = static::getContainer()->get('doctrine.orm.entity_manager');
        $user = $em->getRepository(User::class)->find($userId);

        // Seed EUR→USD = 1.08 (user.currency defaults to USD)
        $er = (new ExchangeRate())->setTargetCurrency('USD')->setRate(1.08)->setFetchedAt(new \DateTimeImmutable());
        $em->persist($er);

        // USD account: 500 USD
        $usd = (new Account())->setName('USD')->setType('CHECKING')->setCurrency('USD')->setBalance(500.0)->setColor('#000')->setIcon('bank')->setUser($user);
        // EUR account: 100 EUR = 108 USD
        $eur = (new Account())->setName('EUR')->setType('SAVINGS')->setCurrency('EUR')->setBalance(100.0)->setColor('#000')->setIcon('bank')->setUser($user);
        $em->persist($usd);
        $em->persist($eur);
        $em->flush();

        $client->request('GET', '/api/stats/summary?year=2026&month=5', [], [], ['HTTP_AUTHORIZATION' => "Bearer $token"]);
        $this->assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertEqualsWithDelta(608.0, $data['totalBalance'], 0.01);
        $this->assertSame([], $data['missingRates']);
    }

    public function testMissingRateReported(): void
    {
        $client = static::createClient();
        [$token, $userId] = $this->registerAndGetToken($client);

        $em = static::getContainer()->get('doctrine.orm.entity_manager');
        $user = $em->getRepository(User::class)->find($userId);

        // GBP account — no exchange rate seeded
        $gbp = (new Account())->setName('GBP')->setType('SAVINGS')->setCurrency('GBP')->setBalance(200.0)->setColor('#000')->setIcon('bank')->setUser($user);
        $em->persist($gbp);
        $em->flush();

        $client->request('GET', '/api/stats/summary?year=2026&month=5', [], [], ['HTTP_AUTHORIZATION' => "Bearer $token"]);
        $this->assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertContains('GBP', $data['missingRates']);
        $this->assertEqualsWithDelta(0.0, $data['totalBalance'], 0.01);
    }
}
