# Multi-Currency Exchange Rates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add EUR-based exchange rate fetching so the dashboard total balance correctly converts multi-currency accounts, and allow transactions to optionally record the original foreign-currency amount.

**Architecture:** A new `ExchangeRate` entity stores one row per non-EUR currency (EUR-based rates). A Symfony Console command fetches from frankfurter.app daily via Symfony Scheduler + Messenger worker. `AccountRepository::getTotalBalance()` converts each account balance to the user's display currency before summing. `TransactionRepository::getMonthlyTotal()` does the same per transaction. `Transaction` gains two nullable fields (`originalCurrency`, `originalAmount`). The frontend adds an optional "paid in foreign currency" section to `AddEditTransaction` and shows original amounts in the transaction list.

**Tech Stack:** Symfony 7, symfony/messenger, symfony/scheduler, symfony/http-client (already installed), Doctrine Migrations, React 18, TypeScript, MUI.

**Docker commands:** All `php`/`composer`/`phpunit` commands run inside the `backend` container:
```bash
docker compose exec backend <command>
```
Frontend commands run inside the `frontend` container:
```bash
docker compose exec frontend sh -c "cd /app && <command>"
```

---

## File Map

| File | Change |
|---|---|
| `backend/src/Entity/ExchangeRate.php` | New entity |
| `backend/src/Repository/ExchangeRateRepository.php` | New repository with `convert()` |
| `backend/migrations/Version20260502000001.php` | Create `exchange_rate` table |
| `backend/migrations/Version20260502000002.php` | Add `original_currency`/`original_amount` to `transaction` |
| `backend/src/Command/UpdateExchangeRatesCommand.php` | New console command |
| `backend/src/Scheduler/ExchangeRateSchedule.php` | New Scheduler schedule |
| `backend/config/packages/messenger.yaml` | New — configure scheduler transport |
| `backend/src/Entity/Transaction.php` | Add 2 nullable fields |
| `backend/src/Repository/AccountRepository.php` | Inject `ExchangeRateRepository`, convert balances |
| `backend/src/Repository/TransactionRepository.php` | Inject `ExchangeRateRepository`, convert monthly totals |
| `backend/src/Controller/StatsController.php` | Add `missingRates` to response |
| `backend/tests/Repository/ExchangeRateRepositoryTest.php` | New |
| `backend/tests/Command/UpdateExchangeRatesCommandTest.php` | New |
| `backend/tests/Controller/StatsControllerTest.php` | New |
| `docker-compose.yml` | Add `worker` service |
| `frontend/src/types/api.ts` | Extend `Transaction`, `StatsSummary` |
| `frontend/src/pages/AddEditTransaction.tsx` | Foreign currency toggle |
| `frontend/src/pages/Transactions.tsx` | Secondary text for original currency |
| `frontend/src/pages/Dashboard.tsx` | `missingRates` warning banner |

---

## Task 1: ExchangeRate entity + migration

**Files:**
- Create: `backend/src/Entity/ExchangeRate.php`
- Create: `backend/migrations/Version20260502000001.php`

- [ ] **Step 1: Create `ExchangeRate.php`**

```php
<?php

namespace App\Entity;

use App\Repository\ExchangeRateRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ExchangeRateRepository::class)]
class ExchangeRate
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 3, unique: true)]
    private string $targetCurrency;

    #[ORM\Column]
    private float $rate;

    #[ORM\Column]
    private \DateTimeImmutable $fetchedAt;

    public function getId(): ?int { return $this->id; }

    public function getTargetCurrency(): string { return $this->targetCurrency; }
    public function setTargetCurrency(string $v): static { $this->targetCurrency = $v; return $this; }

    public function getRate(): float { return $this->rate; }
    public function setRate(float $v): static { $this->rate = $v; return $this; }

    public function getFetchedAt(): \DateTimeImmutable { return $this->fetchedAt; }
    public function setFetchedAt(\DateTimeImmutable $v): static { $this->fetchedAt = $v; return $this; }
}
```

- [ ] **Step 2: Create migration**

Create `backend/migrations/Version20260502000001.php`:

```php
<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260502000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create exchange_rate table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("CREATE TABLE exchange_rate (
            id SERIAL NOT NULL,
            target_currency VARCHAR(3) NOT NULL,
            rate DOUBLE PRECISION NOT NULL,
            fetched_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            PRIMARY KEY(id)
        )");
        $this->addSql('CREATE UNIQUE INDEX uniq_exchange_rate_currency ON exchange_rate (target_currency)');
        $this->addSql("COMMENT ON COLUMN exchange_rate.fetched_at IS '(DC2Type:datetime_immutable)'");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE exchange_rate');
    }
}
```

- [ ] **Step 3: Run migration**

```bash
docker compose exec backend sh -c "cd /var/www/html && php bin/console doctrine:migrations:migrate --no-interaction 2>&1"
```

Expected: `[notice] finished in ... 1 migrations executed`

- [ ] **Step 4: Commit**

```bash
git add backend/src/Entity/ExchangeRate.php backend/migrations/Version20260502000001.php
git commit -m "feat: add ExchangeRate entity and migration"
```

---

## Task 2: ExchangeRateRepository with convert() (TDD)

**Files:**
- Create: `backend/src/Repository/ExchangeRateRepository.php`
- Create: `backend/tests/Repository/ExchangeRateRepositoryTest.php`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/Repository/ExchangeRateRepositoryTest.php`:

```php
<?php

namespace App\Tests\Repository;

use App\Entity\ExchangeRate;
use App\Repository\ExchangeRateRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class ExchangeRateRepositoryTest extends KernelTestCase
{
    private EntityManagerInterface $em;
    private ExchangeRateRepository $repo;

    protected function setUp(): void
    {
        $kernel = self::bootKernel();
        $this->em = $kernel->getContainer()->get('doctrine.orm.entity_manager');
        $this->repo = $this->em->getRepository(ExchangeRate::class);
        $this->em->getConnection()->executeStatement('DELETE FROM exchange_rate');

        foreach ([['USD', 1.08], ['PLN', 4.25], ['GBP', 0.86]] as [$cur, $rate]) {
            $er = (new ExchangeRate())->setTargetCurrency($cur)->setRate($rate)->setFetchedAt(new \DateTimeImmutable());
            $this->em->persist($er);
        }
        $this->em->flush();
    }

    public function testSameCurrencyReturnsAmount(): void
    {
        $this->assertSame(100.0, $this->repo->convert(100.0, 'PLN', 'PLN'));
    }

    public function testEurToTarget(): void
    {
        $this->assertEqualsWithDelta(425.0, $this->repo->convert(100.0, 'EUR', 'PLN'), 0.001);
    }

    public function testTargetToEur(): void
    {
        $this->assertEqualsWithDelta(100.0, $this->repo->convert(108.0, 'USD', 'EUR'), 0.001);
    }

    public function testCrossRate(): void
    {
        // USD→PLN: 100 * (4.25 / 1.08)
        $expected = 100.0 * (4.25 / 1.08);
        $this->assertEqualsWithDelta($expected, $this->repo->convert(100.0, 'USD', 'PLN'), 0.001);
    }

    public function testMissingRateReturnsNull(): void
    {
        $this->assertNull($this->repo->convert(100.0, 'JPY', 'PLN'));
    }
}
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
docker compose exec backend sh -c "cd /var/www/html && APP_ENV=test php bin/phpunit tests/Repository/ExchangeRateRepositoryTest.php -v 2>&1"
```

Expected: ERROR — `ExchangeRateRepository` not found.

- [ ] **Step 3: Create ExchangeRateRepository**

Create `backend/src/Repository/ExchangeRateRepository.php`:

```php
<?php

namespace App\Repository;

use App\Entity\ExchangeRate;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class ExchangeRateRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ExchangeRate::class);
    }

    public function convert(float $amount, string $from, string $to): ?float
    {
        if ($from === $to) {
            return $amount;
        }

        if ($from === 'EUR') {
            $rate = $this->findOneBy(['targetCurrency' => $to]);
            if ($rate === null) return null;
            return $amount * $rate->getRate();
        }

        if ($to === 'EUR') {
            $rate = $this->findOneBy(['targetCurrency' => $from]);
            if ($rate === null) return null;
            return $amount / $rate->getRate();
        }

        $fromRate = $this->findOneBy(['targetCurrency' => $from]);
        $toRate   = $this->findOneBy(['targetCurrency' => $to]);
        if ($fromRate === null || $toRate === null) return null;

        return $amount * ($toRate->getRate() / $fromRate->getRate());
    }
}
```

- [ ] **Step 4: Run tests — expect green**

```bash
docker compose exec backend sh -c "cd /var/www/html && APP_ENV=test php bin/phpunit tests/Repository/ExchangeRateRepositoryTest.php -v 2>&1"
```

Expected: 5 tests, 5 assertions, OK.

- [ ] **Step 5: Commit**

```bash
git add backend/src/Repository/ExchangeRateRepository.php \
        backend/tests/Repository/ExchangeRateRepositoryTest.php
git commit -m "feat: add ExchangeRateRepository with EUR-pivot convert()"
```

---

## Task 3: UpdateExchangeRatesCommand (TDD)

**Files:**
- Create: `backend/src/Command/UpdateExchangeRatesCommand.php`
- Create: `backend/tests/Command/UpdateExchangeRatesCommandTest.php`

Note: `symfony/http-client` is already in `composer.json`.

- [ ] **Step 1: Write failing tests**

Create `backend/tests/Command/UpdateExchangeRatesCommandTest.php`:

```php
<?php

namespace App\Tests\Command;

use App\Command\UpdateExchangeRatesCommand;
use App\Entity\ExchangeRate;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\NullLogger;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\Console\Tester\CommandTester;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;

class UpdateExchangeRatesCommandTest extends KernelTestCase
{
    private EntityManagerInterface $em;

    protected function setUp(): void
    {
        $kernel = self::bootKernel();
        $this->em = $kernel->getContainer()->get('doctrine.orm.entity_manager');
        $this->em->getConnection()->executeStatement('DELETE FROM exchange_rate');
    }

    private function makeCommand(MockHttpClient $client): CommandTester
    {
        $command = new UpdateExchangeRatesCommand($client, $this->em, new NullLogger());
        return new CommandTester($command);
    }

    public function testInsertsRatesOnFirstRun(): void
    {
        $body = json_encode(['base' => 'EUR', 'rates' => ['USD' => 1.08, 'PLN' => 4.25]]);
        $tester = $this->makeCommand(new MockHttpClient(new MockResponse($body)));
        $tester->execute([]);
        $tester->assertCommandIsSuccessful();

        $rates = $this->em->getRepository(ExchangeRate::class)->findAll();
        $this->assertCount(2, $rates);
        $usd = $this->em->getRepository(ExchangeRate::class)->findOneBy(['targetCurrency' => 'USD']);
        $this->assertEqualsWithDelta(1.08, $usd->getRate(), 0.001);
    }

    public function testUpsertsExistingRate(): void
    {
        $old = (new ExchangeRate())->setTargetCurrency('USD')->setRate(1.05)->setFetchedAt(new \DateTimeImmutable('-1 day'));
        $this->em->persist($old);
        $this->em->flush();

        $body = json_encode(['base' => 'EUR', 'rates' => ['USD' => 1.08]]);
        $tester = $this->makeCommand(new MockHttpClient(new MockResponse($body)));
        $tester->execute([]);
        $tester->assertCommandIsSuccessful();

        $all = $this->em->getRepository(ExchangeRate::class)->findAll();
        $this->assertCount(1, $all);
        $this->assertEqualsWithDelta(1.08, $all[0]->getRate(), 0.001);
    }

    public function testHandlesHttpFailureGracefully(): void
    {
        $tester = $this->makeCommand(new MockHttpClient(new MockResponse('error', ['http_code' => 500])));
        $tester->execute([]);
        $tester->assertCommandIsSuccessful();
        $this->assertCount(0, $this->em->getRepository(ExchangeRate::class)->findAll());
    }
}
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
docker compose exec backend sh -c "cd /var/www/html && APP_ENV=test php bin/phpunit tests/Command/UpdateExchangeRatesCommandTest.php -v 2>&1"
```

Expected: ERROR — class not found.

- [ ] **Step 3: Create command**

Create `backend/src/Command/UpdateExchangeRatesCommand.php`:

```php
<?php

namespace App\Command;

use App\Entity\ExchangeRate;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

#[AsCommand(name: 'app:exchange-rates:update', description: 'Fetch latest EUR-based exchange rates from frankfurter.app')]
class UpdateExchangeRatesCommand extends Command
{
    private const API_URL = 'https://api.frankfurter.app/latest';

    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly EntityManagerInterface $em,
        private readonly LoggerInterface $logger,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        try {
            $data = $this->httpClient->request('GET', self::API_URL)->toArray();
        } catch (\Throwable $e) {
            $this->logger->warning('Failed to fetch exchange rates: ' . $e->getMessage());
            return Command::SUCCESS;
        }

        $rates = $data['rates'] ?? [];
        $repo  = $this->em->getRepository(ExchangeRate::class);

        foreach ($rates as $currency => $rate) {
            $entity = $repo->findOneBy(['targetCurrency' => $currency]) ?? (new ExchangeRate())->setTargetCurrency($currency);
            $entity->setRate((float) $rate)->setFetchedAt(new \DateTimeImmutable());
            $this->em->persist($entity);
        }

        $this->em->flush();
        $output->writeln(sprintf('Updated %d exchange rates.', count($rates)));

        return Command::SUCCESS;
    }
}
```

- [ ] **Step 4: Run tests — expect green**

```bash
docker compose exec backend sh -c "cd /var/www/html && APP_ENV=test php bin/phpunit tests/Command/UpdateExchangeRatesCommandTest.php -v 2>&1"
```

Expected: 3 tests, OK.

- [ ] **Step 5: Commit**

```bash
git add backend/src/Command/UpdateExchangeRatesCommand.php \
        backend/tests/Command/UpdateExchangeRatesCommandTest.php
git commit -m "feat: add UpdateExchangeRatesCommand with frankfurter.app fetch"
```

---

## Task 4: Symfony Scheduler + worker Docker service

**Files:**
- Create: `backend/config/packages/messenger.yaml`
- Create: `backend/src/Scheduler/ExchangeRateSchedule.php`
- Modify: `docker-compose.yml`

- [ ] **Step 1: Install symfony/messenger and symfony/scheduler**

```bash
docker compose exec backend sh -c "cd /var/www/html && composer require symfony/messenger symfony/scheduler 2>&1"
```

Expected: packages installed successfully.

- [ ] **Step 2: Create `messenger.yaml`**

Create `backend/config/packages/messenger.yaml`:

```yaml
framework:
    messenger:
        transports:
            scheduler_default:
                dsn: 'scheduler://default'
```

- [ ] **Step 3: Create `ExchangeRateSchedule.php`**

Create `backend/src/Scheduler/ExchangeRateSchedule.php`:

```php
<?php

namespace App\Scheduler;

use Symfony\Component\Scheduler\Attribute\AsSchedule;
use Symfony\Component\Scheduler\RecurringMessage;
use Symfony\Component\Scheduler\Schedule;
use Symfony\Component\Scheduler\ScheduleProviderInterface;
use Symfony\Component\Console\Messenger\RunCommandMessage;

#[AsSchedule]
class ExchangeRateSchedule implements ScheduleProviderInterface
{
    public function getSchedule(): Schedule
    {
        return (new Schedule())->add(
            RecurringMessage::cron('0 2 * * *', new RunCommandMessage('app:exchange-rates:update'))
        );
    }
}
```

- [ ] **Step 4: Add worker service to `docker-compose.yml`**

Add this service at the end of the `services:` block (before the `volumes:` section):

```yaml
  worker:
    build:
      context: ./backend
      dockerfile: ../docker/php/Dockerfile
    command: sh -c "cd /var/www/html && php bin/console messenger:consume scheduler_default --time-limit=3600"
    restart: unless-stopped
    volumes:
      - ./backend:/var/www/html
    environment:
      DATABASE_URL: postgresql://user:password@db:5432/budget?serverVersion=16&charset=utf8
      APP_ENV: dev
    depends_on:
      - db
```

- [ ] **Step 5: Restart Docker and verify worker starts**

```bash
docker compose down && docker compose up -d
docker compose logs worker --tail=20
```

Expected: worker logs show `[OK] Consuming messages from transport "scheduler_default"` with no crash.

- [ ] **Step 6: Verify command is discoverable**

```bash
docker compose exec backend sh -c "cd /var/www/html && php bin/console list app 2>&1"
```

Expected: `app:exchange-rates:update` appears in the list.

- [ ] **Step 7: Commit**

```bash
git add backend/config/packages/messenger.yaml \
        backend/src/Scheduler/ExchangeRateSchedule.php \
        backend/composer.json \
        backend/composer.lock \
        docker-compose.yml
git commit -m "feat: add Symfony Scheduler and worker service for daily exchange rate fetch"
```

---

## Task 5: AccountRepository multi-currency + StatsController missingRates (TDD)

**Files:**
- Modify: `backend/src/Repository/AccountRepository.php`
- Modify: `backend/src/Controller/StatsController.php`
- Create: `backend/tests/Controller/StatsControllerTest.php`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/Controller/StatsControllerTest.php`:

```php
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
    }
}
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
docker compose exec backend sh -c "cd /var/www/html && APP_ENV=test php bin/phpunit tests/Controller/StatsControllerTest.php -v 2>&1"
```

Expected: FAIL — `missingRates` key absent from response.

- [ ] **Step 3: Refactor AccountRepository**

Replace `backend/src/Repository/AccountRepository.php`:

```php
<?php

namespace App\Repository;

use App\Entity\Account;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Account>
 */
class AccountRepository extends ServiceEntityRepository
{
    public function __construct(
        ManagerRegistry $registry,
        private readonly ExchangeRateRepository $exchangeRateRepository,
    ) {
        parent::__construct($registry, Account::class);
    }

    /**
     * @return array{total: float, missingCurrencies: string[]}
     */
    public function getTotalBalance(User $user): array
    {
        $rows = $this->createQueryBuilder('a')
            ->select('a.balance', 'a.currency')
            ->where('a.isArchived = false')
            ->andWhere('a.user = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->getArrayResult();

        $userCurrency = $user->getCurrency();
        $total = 0.0;
        $missingCurrencies = [];

        foreach ($rows as $row) {
            $converted = $this->exchangeRateRepository->convert(
                (float) $row['balance'],
                $row['currency'],
                $userCurrency
            );
            if ($converted === null) {
                $missingCurrencies[] = $row['currency'];
            } else {
                $total += $converted;
            }
        }

        return ['total' => $total, 'missingCurrencies' => $missingCurrencies];
    }
}
```

- [ ] **Step 4: Update StatsController**

Replace `backend/src/Controller/StatsController.php`:

```php
<?php

namespace App\Controller;

use App\Entity\User;
use App\Repository\AccountRepository;
use App\Repository\PlannedItemRepository;
use App\Repository\TransactionRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

class StatsController extends AbstractController
{
    public function __construct(
        private readonly AccountRepository $accountRepository,
        private readonly TransactionRepository $transactionRepository,
        private readonly PlannedItemRepository $plannedItemRepository,
    ) {}

    #[Route("/api/stats/summary", name: "stats_summary", methods: ["GET"])]
    public function summary(Request $request): JsonResponse
    {
        $year  = (int) $request->query->get("year", date("Y"));
        $month = (int) $request->query->get("month", date("n"));

        /** @var User $user */
        $user = $this->getUser();

        $balanceData  = $this->accountRepository->getTotalBalance($user);
        $totalBalance = $balanceData['total'];
        $missingRates = array_values(array_unique($balanceData['missingCurrencies']));

        $monthlyIncome   = $this->transactionRepository->getMonthlyTotal("INCOME", $month, $year, $user);
        $monthlyExpense  = $this->transactionRepository->getMonthlyTotal("EXPENSE", $month, $year, $user);
        $plannedIncome   = $this->plannedItemRepository->getPlannedIncomeForMonth($month, $year, $user);
        $plannedExpenses = $this->plannedItemRepository->getPlannedExpensesForMonth($month, $year, $user);

        return $this->json([
            "totalBalance"            => $totalBalance,
            "monthlyIncome"           => $monthlyIncome,
            "monthlyExpense"          => $monthlyExpense,
            "plannedIncomeThisMonth"  => $plannedIncome,
            "plannedExpensesThisMonth"=> $plannedExpenses,
            "forecastedBalance"       => $totalBalance + $plannedIncome - $plannedExpenses,
            "missingRates"            => $missingRates,
        ]);
    }

    #[Route("/api/stats/monthly-trend", name: "stats_monthly_trend", methods: ["GET"])]
    public function monthlyTrend(Request $request): JsonResponse
    {
        $months = min(max((int) $request->query->get("months", 6), 1), 24);

        /** @var User $user */
        $user = $this->getUser();
        $data = [];
        for ($i = $months - 1; $i >= 0; $i--) {
            $date  = new \DateTimeImmutable("first day of -$i months");
            $month = (int) $date->format("n");
            $year  = (int) $date->format("Y");
            $data[] = [
                "month"   => $date->format("Y-m"),
                "income"  => $this->transactionRepository->getMonthlyTotal("INCOME", $month, $year, $user),
                "expense" => $this->transactionRepository->getMonthlyTotal("EXPENSE", $month, $year, $user),
            ];
        }

        return $this->json($data);
    }
}
```

- [ ] **Step 5: Run the new tests — expect green**

```bash
docker compose exec backend sh -c "cd /var/www/html && APP_ENV=test php bin/phpunit tests/Controller/StatsControllerTest.php -v 2>&1"
```

Expected: 3 tests, OK.

- [ ] **Step 6: Run full test suite — expect all green**

```bash
docker compose exec backend sh -c "cd /var/www/html && APP_ENV=test php bin/phpunit 2>&1"
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add backend/src/Repository/AccountRepository.php \
        backend/src/Controller/StatsController.php \
        backend/tests/Controller/StatsControllerTest.php
git commit -m "feat: convert multi-currency balances in getTotalBalance, add missingRates to stats"
```

---

## Task 6: TransactionRepository — currency-aware monthly totals (TDD)

**Files:**
- Modify: `backend/src/Repository/TransactionRepository.php`
- Modify: `backend/tests/Controller/StatsControllerTest.php`

- [ ] **Step 1: Add failing test for monthly total conversion**

Append this test method to `StatsControllerTest`:

```php
    public function testMonthlyIncomeConvertedToUserCurrency(): void
    {
        $client = static::createClient();
        [$token, $userId] = $this->registerAndGetToken($client);

        $em = static::getContainer()->get('doctrine.orm.entity_manager');
        $user = $em->getRepository(User::class)->find($userId);

        // EUR→USD = 1.08 (user.currency = USD)
        $er = (new ExchangeRate())->setTargetCurrency('USD')->setRate(1.08)->setFetchedAt(new \DateTimeImmutable());
        $em->persist($er);

        $eurAccount = (new Account())->setName('EUR')->setType('SAVINGS')->setCurrency('EUR')->setBalance(0.0)->setColor('#000')->setIcon('bank')->setUser($user);
        $em->persist($eurAccount);
        $em->flush();

        // Add EUR income transaction: 100 EUR = 108 USD
        $client->request('POST', '/api/transactions', [], [],
            ['CONTENT_TYPE' => 'application/ld+json', 'HTTP_AUTHORIZATION' => "Bearer $token"],
            json_encode([
                'type' => 'INCOME',
                'amount' => 100.0,
                'account' => '/api/accounts/' . $eurAccount->getId(),
                'date' => '2026-05-15T00:00:00+00:00',
            ])
        );
        $this->assertResponseStatusCodeSame(201);

        $client->request('GET', '/api/stats/summary?year=2026&month=5', [], [], ['HTTP_AUTHORIZATION' => "Bearer $token"]);
        $this->assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertEqualsWithDelta(108.0, $data['monthlyIncome'], 0.01);
    }
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
docker compose exec backend sh -c "cd /var/www/html && APP_ENV=test php bin/phpunit tests/Controller/StatsControllerTest.php::testMonthlyIncomeConvertedToUserCurrency -v 2>&1"
```

Expected: FAIL — returns 100.0 instead of 108.0.

- [ ] **Step 3: Refactor TransactionRepository**

Replace `backend/src/Repository/TransactionRepository.php`:

```php
<?php

namespace App\Repository;

use App\Entity\Transaction;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Transaction>
 */
class TransactionRepository extends ServiceEntityRepository
{
    public function __construct(
        ManagerRegistry $registry,
        private readonly ExchangeRateRepository $exchangeRateRepository,
    ) {
        parent::__construct($registry, Transaction::class);
    }

    public function getMonthlyTotal(string $type, int $month, int $year, User $user): float
    {
        $start = new \DateTimeImmutable(sprintf('%d-%02d-01', $year, $month));
        $end   = $start->modify('first day of next month');

        $rows = $this->createQueryBuilder('t')
            ->select('t.amount', 'a.currency')
            ->join('t.account', 'a')
            ->where('t.type = :type')
            ->andWhere('t.date >= :start')
            ->andWhere('t.date < :end')
            ->andWhere('t.user = :user')
            ->setParameter('type', $type)
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->setParameter('user', $user)
            ->getQuery()
            ->getArrayResult();

        $userCurrency = $user->getCurrency();
        $total = 0.0;
        foreach ($rows as $row) {
            $converted = $this->exchangeRateRepository->convert(
                (float) $row['amount'],
                $row['currency'],
                $userCurrency
            );
            $total += $converted ?? (float) $row['amount'];
        }
        return $total;
    }

    public function getSpentForBudget(int $categoryId, int $month, int $year, User $user): float
    {
        $start = new \DateTimeImmutable(sprintf('%d-%02d-01', $year, $month));
        $end   = $start->modify('first day of next month');

        $result = $this->createQueryBuilder('t')
            ->select('COALESCE(SUM(t.amount), 0) as spent')
            ->where('t.type = :type')
            ->andWhere('t.date >= :start')
            ->andWhere('t.date < :end')
            ->andWhere('IDENTITY(t.category) = :categoryId')
            ->andWhere('t.user = :user')
            ->setParameter('type', 'EXPENSE')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->setParameter('categoryId', $categoryId)
            ->setParameter('user', $user)
            ->getQuery()
            ->getSingleResult();

        return (float) $result['spent'];
    }
}
```

- [ ] **Step 4: Run full test suite — expect all green**

```bash
docker compose exec backend sh -c "cd /var/www/html && APP_ENV=test php bin/phpunit 2>&1"
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/Repository/TransactionRepository.php \
        backend/tests/Controller/StatsControllerTest.php
git commit -m "feat: convert per-account currency in getMonthlyTotal"
```

---

## Task 7: Transaction entity original fields + migration

**Files:**
- Modify: `backend/src/Entity/Transaction.php`
- Create: `backend/migrations/Version20260502000002.php`

- [ ] **Step 1: Add fields and validation to Transaction entity**

In `backend/src/Entity/Transaction.php`, add this use statement to the imports at the top:

```php
use Symfony\Component\Validator\Constraints as Assert;
```

Add this class-level constraint on the `Transaction` class (between `#[ORM\Entity...]` and `class Transaction`):

```php
#[Assert\Expression(
    "(this.getOriginalCurrency() === null) === (this.getOriginalAmount() === null)",
    message: "originalCurrency and originalAmount must both be set or both be null"
)]
```

Then add these two properties after the `$note` property (after line 61):

```php
    #[ORM\Column(length: 3, nullable: true)]
    #[Groups(['transaction:read', 'transaction:write'])]
    private ?string $originalCurrency = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['transaction:read', 'transaction:write'])]
    private ?float $originalAmount = null;
```

Then add these getters/setters after `setNote()`:

```php
    public function getOriginalCurrency(): ?string { return $this->originalCurrency; }
    public function setOriginalCurrency(?string $v): static { $this->originalCurrency = $v; return $this; }

    public function getOriginalAmount(): ?float { return $this->originalAmount; }
    public function setOriginalAmount(?float $v): static { $this->originalAmount = $v; return $this; }
```

- [ ] **Step 2: Create migration**

Create `backend/migrations/Version20260502000002.php`:

```php
<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260502000002 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add original_currency and original_amount to transaction';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE transaction ADD COLUMN original_currency VARCHAR(3) NULL');
        $this->addSql('ALTER TABLE transaction ADD COLUMN original_amount DOUBLE PRECISION NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE transaction DROP COLUMN original_currency');
        $this->addSql('ALTER TABLE transaction DROP COLUMN original_amount');
    }
}
```

- [ ] **Step 3: Run migration**

```bash
docker compose exec backend sh -c "cd /var/www/html && php bin/console doctrine:migrations:migrate --no-interaction 2>&1"
```

Expected: `1 migrations executed`

- [ ] **Step 4: Run full test suite**

```bash
docker compose exec backend sh -c "cd /var/www/html && APP_ENV=test php bin/phpunit 2>&1"
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/Entity/Transaction.php \
        backend/migrations/Version20260502000002.php
git commit -m "feat: add originalCurrency and originalAmount fields to Transaction"
```

---

## Task 8: Frontend types + AddEditTransaction

**Files:**
- Modify: `frontend/src/types/api.ts`
- Modify: `frontend/src/pages/AddEditTransaction.tsx`

- [ ] **Step 1: Extend types in `api.ts`**

In `frontend/src/types/api.ts`, replace the `Transaction` interface:

```typescript
export interface Transaction {
  '@id'?: string;
  id?: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  amount: number;
  account: Account;
  category?: Category;
  toAccount?: Account;
  note?: string;
  date: string;
  plannedItem?: { id: number };
  originalCurrency?: string | null;
  originalAmount?: number | null;
  createdAt?: string;
}
```

Replace the `StatsSummary` interface:

```typescript
export interface StatsSummary {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  plannedIncomeThisMonth: number;
  plannedExpensesThisMonth: number;
  forecastedBalance: number;
  missingRates: string[];
}
```

- [ ] **Step 2: Update AddEditTransaction**

Replace `frontend/src/pages/AddEditTransaction.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Stack,
  TextField,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Button,
  CircularProgress,
  Collapse,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Check as SaveIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import {
  useAccounts,
  useCategories,
  useTransaction,
  useCreateTransaction,
  useUpdateTransaction,
} from '../hooks/useApi';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'PLN', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY'];

const AddEditTransaction = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const { data: accounts, isLoading: isAccountsLoading } = useAccounts();
  const { data: categories, isLoading: isCategoriesLoading } = useCategories();
  const { data: transaction, isLoading: isTransactionLoading } = useTransaction(id);
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction(id || '');

  const [type, setType] = useState<'INCOME' | 'EXPENSE' | 'TRANSFER'>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const [showOriginal, setShowOriginal] = useState(false);
  const [originalCurrency, setOriginalCurrency] = useState('EUR');
  const [originalAmount, setOriginalAmount] = useState('');

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(transaction.amount.toString());
      setAccountId(transaction.account['@id'] || '');
      setCategoryId(transaction.category?.['@id'] || '');
      setToAccountId(transaction.toAccount?.['@id'] || '');
      setNote(transaction.note || '');
      setDate(transaction.date.split('T')[0]);
      if (transaction.originalCurrency && transaction.originalAmount != null) {
        setShowOriginal(true);
        setOriginalCurrency(transaction.originalCurrency);
        setOriginalAmount(transaction.originalAmount.toString());
      }
    }
  }, [transaction]);

  const filteredCategories = categories?.filter(
    c => !c.isArchived && c.type === (type === 'TRANSFER' ? 'EXPENSE' : type)
  ) || [];

  const derivedRate = (() => {
    const a = parseFloat(amount);
    const o = parseFloat(originalAmount);
    if (!showOriginal || !a || !o) return null;
    const accountCurrency = accounts?.find(ac => ac['@id'] === accountId)?.currency ?? '';
    if (!accountCurrency) return null;
    return `1 ${originalCurrency} = ${(a / o).toFixed(4)} ${accountCurrency}`;
  })();

  const handleSave = async () => {
    const payload: Record<string, unknown> = {
      type,
      amount: parseFloat(amount),
      account: accountId,
      category: type === 'TRANSFER' ? undefined : (categoryId || undefined),
      toAccount: type === 'TRANSFER' ? toAccountId : undefined,
      note,
      date: new Date(date).toISOString(),
    };

    if (showOriginal && originalCurrency && originalAmount) {
      payload.originalCurrency = originalCurrency;
      payload.originalAmount = parseFloat(originalAmount);
    } else {
      payload.originalCurrency = null;
      payload.originalAmount = null;
    }

    if (isEdit) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await updateMutation.mutateAsync(payload as any);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await createMutation.mutateAsync(payload as any);
    }
    navigate(-1);
  };

  const isLoading = isAccountsLoading || isCategoriesLoading || isTransactionLoading;

  if (isLoading) {
    return (
      <Layout title={isEdit ? 'Edit Transaction' : 'Add Transaction'}>
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout
      title={isEdit ? 'Edit Transaction' : 'Add Transaction'}
      navigationIcon={
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBackIcon />
        </IconButton>
      }
      actions={
        <IconButton onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
          <SaveIcon />
        </IconButton>
      }
    >
      <Box p={2}>
        <Stack spacing={3}>
          <ToggleButtonGroup
            value={type}
            exclusive
            onChange={(_, newType) => newType && setType(newType)}
            fullWidth
            color="primary"
          >
            <ToggleButton value="INCOME">Income</ToggleButton>
            <ToggleButton value="EXPENSE">Expense</ToggleButton>
            <ToggleButton value="TRANSFER">Transfer</ToggleButton>
          </ToggleButtonGroup>

          <TextField
            label="Amount"
            variant="outlined"
            fullWidth
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputProps={{ step: '0.01' }}
          />

          <TextField
            label="Date"
            variant="outlined"
            fullWidth
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            select
            label="Account"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            fullWidth
          >
            {accounts?.map((option) => (
              <MenuItem key={option['@id']} value={option['@id']}>
                {option.name}
              </MenuItem>
            ))}
          </TextField>

          {type === 'TRANSFER' ? (
            <TextField
              select
              label="To Account"
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              fullWidth
            >
              {accounts?.filter(a => a['@id'] !== accountId).map((option) => (
                <MenuItem key={option['@id']} value={option['@id']}>
                  {option.name}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <TextField
              select
              label="Category (optional)"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              fullWidth
            >
              <MenuItem value="">— None —</MenuItem>
              {filteredCategories.map((option) => (
                <MenuItem key={option['@id']} value={option['@id']}>
                  {option.name}
                </MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            label="Note (optional)"
            variant="outlined"
            fullWidth
            multiline
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          {type !== 'TRANSFER' && (
            <Box>
              <Button
                variant="text"
                size="small"
                onClick={() => setShowOriginal(v => !v)}
                sx={{ px: 0, color: 'text.secondary' }}
              >
                {showOriginal ? '▲ Hide foreign currency' : '▼ Paid in foreign currency?'}
              </Button>
              <Collapse in={showOriginal}>
                <Stack spacing={2} mt={1.5}>
                  <Stack direction="row" spacing={2}>
                    <TextField
                      select
                      label="Original currency"
                      value={originalCurrency}
                      onChange={(e) => setOriginalCurrency(e.target.value)}
                      sx={{ width: 160 }}
                    >
                      {CURRENCIES.map(c => (
                        <MenuItem key={c} value={c}>{c}</MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="Original amount"
                      type="number"
                      value={originalAmount}
                      onChange={(e) => setOriginalAmount(e.target.value)}
                      inputProps={{ step: '0.01' }}
                      fullWidth
                    />
                  </Stack>
                  {derivedRate && (
                    <Typography variant="caption" color="text.secondary">
                      Rate: {derivedRate}
                    </Typography>
                  )}
                </Stack>
              </Collapse>
            </Box>
          )}

          <Button
            variant="contained"
            size="large"
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
            sx={{ mt: 2, height: 56, borderRadius: 3 }}
          >
            {isEdit ? 'Update Transaction' : 'Save Transaction'}
          </Button>
        </Stack>
      </Box>
    </Layout>
  );
};

export default AddEditTransaction;
```

- [ ] **Step 3: Verify TypeScript build**

```bash
docker compose exec frontend sh -c "cd /app && npx tsc --noEmit 2>&1"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/api.ts \
        frontend/src/pages/AddEditTransaction.tsx
git commit -m "feat: add foreign currency fields to Transaction type and AddEditTransaction form"
```

---

## Task 9: Frontend — transaction list secondary text + Dashboard warning

**Files:**
- Modify: `frontend/src/pages/Transactions.tsx`
- Modify: `frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: Add original currency to transaction rows in Transactions.tsx**

In `frontend/src/pages/Transactions.tsx`, replace the `<Box>` at lines 225–229 inside `TransactionListItem`:

```tsx
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 'bold', color }}>
                {prefix}{formatAmount(transaction.amount, currency)}
              </Typography>
            </Box>
```

with:

```tsx
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 'bold', color }}>
                {prefix}{formatAmount(transaction.amount, currency)}
              </Typography>
              {transaction.originalCurrency && transaction.originalAmount != null && (
                <Typography variant="caption" display="block" color="text.secondary" textAlign="right">
                  {formatAmount(transaction.originalAmount, transaction.originalCurrency)}
                </Typography>
              )}
            </Box>
```

`Typography` is already imported in this file.

- [ ] **Step 2: Add missingRates warning to Dashboard.tsx**

In `frontend/src/pages/Dashboard.tsx`, add an `Alert` import:

```typescript
import { Alert } from '@mui/material';
```

Then, inside the return JSX, add this immediately after the opening `<Layout ...>` tag (before the first `<Box>`):

```tsx
{stats?.missingRates && stats.missingRates.length > 0 && (
  <Alert severity="warning" sx={{ mx: 2, mt: 1 }}>
    Balance may be incomplete — exchange rate unavailable for: {stats.missingRates.join(', ')}
  </Alert>
)}
```

- [ ] **Step 3: Verify TypeScript build**

```bash
docker compose exec frontend sh -c "cd /app && npx tsc --noEmit 2>&1"
```

Expected: no output.

- [ ] **Step 4: Run full backend test suite**

```bash
docker compose exec backend sh -c "cd /var/www/html && APP_ENV=test php bin/phpunit 2>&1"
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Transactions.tsx \
        frontend/src/pages/Dashboard.tsx
git commit -m "feat: show original currency in transaction list and missing-rates warning on dashboard"
```
