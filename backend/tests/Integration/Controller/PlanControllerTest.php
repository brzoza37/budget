<?php

namespace App\Tests\Integration\Controller;

use App\Entity\Account;
use App\Entity\PlannedItem;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class PlanControllerTest extends WebTestCase
{
    private const PASSWORD = 'Secret123!@#';

    protected function setUp(): void
    {
        parent::setUp();
        static::ensureKernelShutdown();
        $kernel = static::bootKernel();
        /** @var EntityManagerInterface $em */
        $em = $kernel->getContainer()->get('doctrine.orm.entity_manager');
        $em->getConnection()->executeStatement('DELETE FROM transaction');
        $em->getConnection()->executeStatement('DELETE FROM planned_item');
        $em->getConnection()->executeStatement('DELETE FROM recurring_event');
        $em->getConnection()->executeStatement('DELETE FROM account');
        $em->getConnection()->executeStatement('DELETE FROM "user"');
        static::ensureKernelShutdown();
    }

    /** @return array{string, int} */
    private function registerAndGetToken(KernelBrowser $client, string $email = 'plan@example.com'): array
    {
        $client->request('POST', '/api/auth/register', [], [],
            ['CONTENT_TYPE' => 'application/json'],
            (string) json_encode(['email' => $email, 'password' => self::PASSWORD, 'displayName' => 'Plan'])
        );
        /** @var array{token: string, user: array{id: int}} $data */
        $data = json_decode((string) $client->getResponse()->getContent(), true);
        return [$data['token'], $data['user']['id']];
    }

    private function createPlannedItem(EntityManagerInterface $em, User $user, Account $account, float $amount, string $type = 'EXPENSE'): PlannedItem
    {
        $item = new PlannedItem();
        $item->setName('Monthly rent')
             ->setAmount($amount)
             ->setType($type)
             ->setAccount($account)
             ->setDueDate(new \DateTimeImmutable('2026-05-01'))
             ->setUser($user);
        $em->persist($item);
        $em->flush();
        return $item;
    }

    public function testConfirmHappyPath(): void
    {
        $client = static::createClient();
        [$token, $userId] = $this->registerAndGetToken($client);

        /** @var EntityManagerInterface $em */
        $em = static::getContainer()->get('doctrine.orm.entity_manager');
        /** @var User $user */
        $user = $em->getRepository(User::class)->find($userId);
        $account = (new Account())->setName('Main')->setType('CHECKING')->setCurrency('USD')->setBalance(1000.0)->setColor('#000')->setIcon('bank')->setUser($user);
        $em->persist($account);
        $em->flush();

        $item = $this->createPlannedItem($em, $user, $account, 300.0);

        $client->request('POST', '/api/plan/confirm/' . $item->getId(), [], [],
            ['CONTENT_TYPE' => 'application/json', 'HTTP_AUTHORIZATION' => "Bearer {$token}"],
            (string) json_encode(['amount' => 300.0, 'accountId' => $account->getId()])
        );

        $this->assertResponseIsSuccessful();
        /** @var array{isPaid: bool, paidAmount: float, transactionId: int|null} $data */
        $data = json_decode((string) $client->getResponse()->getContent(), true);
        $this->assertTrue($data['isPaid']);
        $this->assertEqualsWithDelta(300.0, $data['paidAmount'], 0.01);
        $this->assertNotNull($data['transactionId']);

        $em->clear();
        $freshAccount = $em->find(Account::class, $account->getId());
        $this->assertNotNull($freshAccount);
        $this->assertEqualsWithDelta(700.0, $freshAccount->getBalance(), 0.01);
    }

    public function testConfirmWrongUser(): void
    {
        $client = static::createClient();
        [$token] = $this->registerAndGetToken($client, 'user1@example.com');
        [, $user2Id] = $this->registerAndGetToken($client, 'user2@example.com');

        /** @var EntityManagerInterface $em */
        $em = static::getContainer()->get('doctrine.orm.entity_manager');
        /** @var User $user2 */
        $user2 = $em->getRepository(User::class)->find($user2Id);
        $account = (new Account())->setName('A')->setType('CHECKING')->setCurrency('USD')->setBalance(0.0)->setColor('#000')->setIcon('bank')->setUser($user2);
        $em->persist($account);
        $em->flush();
        $item = $this->createPlannedItem($em, $user2, $account, 100.0);

        $client->request('POST', '/api/plan/confirm/' . $item->getId(), [], [],
            ['CONTENT_TYPE' => 'application/json', 'HTTP_AUTHORIZATION' => "Bearer {$token}"],
            (string) json_encode(['amount' => 100.0, 'accountId' => $account->getId()])
        );

        $this->assertResponseStatusCodeSame(404);
    }

    public function testConfirmInvalidAccount(): void
    {
        $client = static::createClient();
        [$token, $userId] = $this->registerAndGetToken($client);

        /** @var EntityManagerInterface $em */
        $em = static::getContainer()->get('doctrine.orm.entity_manager');
        /** @var User $user */
        $user = $em->getRepository(User::class)->find($userId);
        $account = (new Account())->setName('A')->setType('CHECKING')->setCurrency('USD')->setBalance(0.0)->setColor('#000')->setIcon('bank')->setUser($user);
        $em->persist($account);
        $em->flush();
        $item = $this->createPlannedItem($em, $user, $account, 100.0);

        $client->request('POST', '/api/plan/confirm/' . $item->getId(), [], [],
            ['CONTENT_TYPE' => 'application/json', 'HTTP_AUTHORIZATION' => "Bearer {$token}"],
            (string) json_encode(['amount' => 100.0, 'accountId' => 99999])
        );

        $this->assertResponseStatusCodeSame(400);
    }

    public function testConfirmMarksPaidWhenFull(): void
    {
        $client = static::createClient();
        [$token, $userId] = $this->registerAndGetToken($client);

        /** @var EntityManagerInterface $em */
        $em = static::getContainer()->get('doctrine.orm.entity_manager');
        /** @var User $user */
        $user = $em->getRepository(User::class)->find($userId);
        $account = (new Account())->setName('A')->setType('CHECKING')->setCurrency('USD')->setBalance(500.0)->setColor('#000')->setIcon('bank')->setUser($user);
        $em->persist($account);
        $em->flush();
        $item = $this->createPlannedItem($em, $user, $account, 200.0);

        $client->request('POST', '/api/plan/confirm/' . $item->getId(), [], [],
            ['CONTENT_TYPE' => 'application/json', 'HTTP_AUTHORIZATION' => "Bearer {$token}"],
            (string) json_encode(['amount' => 200.0, 'accountId' => $account->getId()])
        );

        $this->assertResponseIsSuccessful();
        /** @var array{isPaid: bool} $data */
        $data = json_decode((string) $client->getResponse()->getContent(), true);
        $this->assertTrue($data['isPaid']);
    }

    public function testGenerateMonthHappyPath(): void
    {
        $client = static::createClient();
        [$token] = $this->registerAndGetToken($client);

        $client->request('POST', '/api/plan/generate_month', [], [],
            ['CONTENT_TYPE' => 'application/json', 'HTTP_AUTHORIZATION' => "Bearer {$token}"],
            (string) json_encode(['month' => 5, 'year' => 2026])
        );

        $this->assertResponseIsSuccessful();
        /** @var array{generated: int} $data */
        $data = json_decode((string) $client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('generated', $data);
        $this->assertIsInt($data['generated']);
    }

    public function testGenerateMonthInvalidMonth(): void
    {
        $client = static::createClient();
        [$token] = $this->registerAndGetToken($client);

        $client->request('POST', '/api/plan/generate_month', [], [],
            ['CONTENT_TYPE' => 'application/json', 'HTTP_AUTHORIZATION' => "Bearer {$token}"],
            (string) json_encode(['month' => 13, 'year' => 2026])
        );

        $this->assertResponseStatusCodeSame(400);
    }
}
