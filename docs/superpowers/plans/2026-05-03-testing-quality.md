# Testing Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add PHPStan level-9 static analysis, PHPUnit unit and integration tests, and a GitHub Actions CI workflow that blocks merging to master when either fails.

**Architecture:** PHPStan analyses `src/` and `tests/` via a `phpstan.neon` config with the Symfony extension (needs `cache:warmup` to generate container XML). Tests are split into `tests/Unit/` (PHPUnit mocks, no DB) and `tests/Integration/` (KernelTestCase/WebTestCase against the real test DB). CI runs both jobs in parallel on every pull request.

**Tech Stack:** PHPUnit 12, PHPStan 1.x + phpstan-symfony, GitHub Actions (`shivammathur/setup-php`, PostgreSQL service container)

---

## File Structure

**Create:**
- `backend/phpstan.neon`
- `backend/phpunit.ci.xml`
- `backend/tests/Unit/Service/RecurringEventGeneratorServiceTest.php`
- `backend/tests/Unit/State/BudgetStateProviderTest.php`
- `backend/tests/Integration/Repository/TransactionRepositoryTest.php`
- `backend/tests/Integration/Repository/AccountRepositoryTest.php`
- `backend/tests/Integration/Controller/PlanControllerTest.php`
- `.github/workflows/ci.yml`

**Modify:**
- `backend/composer.json` — add phpstan packages + convenience scripts
- `backend/src/Service/RecurringEventGeneratorService.php` — fix nullable return usage
- `backend/src/State/BudgetStateProvider.php` — fix iterable check + null guards
- `backend/src/Command/UpdateExchangeRatesCommand.php` — fix mixed array access
- `backend/src/Controller/AuthController.php` — fix json_decode type
- `backend/src/Controller/PlanController.php` — fix json_decode type
- `backend/tests/Repository/ExchangeRateRepositoryTest.php` — fix getRepository assignment
- `backend/tests/Controller/StatsControllerTest.php` — fix getRepository assignment

---

## Task 1: Install PHPStan and create config

**Files:**
- Modify: `backend/composer.json`
- Create: `backend/phpstan.neon`

- [ ] **Step 1: Install PHPStan packages**

```bash
docker compose exec backend composer require --dev \
  phpstan/phpstan \
  phpstan/extension-installer \
  phpstan-symfony/phpstan-symfony
```

Expected: packages added to `composer.json` and `composer.lock`, `vendor/` updated.

- [ ] **Step 2: Add convenience scripts to composer.json**

In `backend/composer.json`, add inside the `"scripts"` block (alongside the existing `"auto-scripts"` key):

```json
"phpstan": "vendor/bin/phpstan analyse --no-progress",
"test": "vendor/bin/phpunit"
```

- [ ] **Step 3: Create backend/phpstan.neon**

```neon
includes:
    - vendor/phpstan/extension-installer/src/Config/config.neon

parameters:
    level: 9
    paths:
        - src
        - tests
    symfony:
        containerXmlPath: var/cache/dev/App_KernelDevDebugContainer.xml
```

- [ ] **Step 4: Warm up the dev cache to generate container XML**

```bash
docker compose exec backend php bin/console cache:warmup --env=dev
```

Expected: `var/cache/dev/App_KernelDevDebugContainer.xml` exists.

- [ ] **Step 5: Run PHPStan to see all violations**

```bash
docker compose exec backend vendor/bin/phpstan analyse --no-progress
```

Note all violations listed. Tasks 2–5 fix them. The exact list depends on the runtime, but expected violations are in the files listed in the architecture section.

---

## Task 2: Fix PHPStan violations in RecurringEventGeneratorService

**Files:**
- Modify: `backend/src/Service/RecurringEventGeneratorService.php`

All properties on `RecurringEvent` are PHP-nullable (Doctrine convention) but always set in practice. The service must handle nullable returns to satisfy level 9.

- [ ] **Step 1: Fix generate() — null-unsafe nullable field usage**

Replace the item-building block in `generate()` (lines 33–41):

```php
            $item = new PlannedItem();
            $item->setName($event->getName() ?? '');
            $item->setAmount((float) ($event->getAmount() ?? 0));
            $item->setType($event->getType() ?? 'EXPENSE');
            $item->setCategory($event->getCategory());
            $item->setAccount($event->getAccount());
            $item->setDueDate($date);
            $item->setRecurringEvent($event);
            $item->setUser($event->getUser());
            $item->setNote($event->getNote());
```

- [ ] **Step 2: Fix computeDates() — nullable startDate used in comparison**

Replace the first two lines of `computeDates()`:

```php
    private function computeDates(RecurringEvent $event, \DateTimeImmutable $until): array
    {
        $current = $event->getStartDate();
        if ($current === null) {
            return [];
        }

        $dates = [];
        $limit = 500;
        $count = 0;

        while ($current <= $until && $count < $limit) {
```

- [ ] **Step 3: Fix nextDate() — nullable repeatEvery/repeatUnit used in string interpolation**

Replace the first two lines of `nextDate()`:

```php
    private function nextDate(RecurringEvent $event, \DateTimeImmutable $from): \DateTimeImmutable
    {
        $n = $event->getRepeatEvery() ?? 1;
        $unit = $event->getRepeatUnit() ?? 'months';
```

- [ ] **Step 4: Run PHPStan targeting this file to verify clean**

```bash
docker compose exec backend vendor/bin/phpstan analyse --no-progress src/Service/RecurringEventGeneratorService.php
```

Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add backend/src/Service/RecurringEventGeneratorService.php
git commit -m "fix: resolve PHPStan level-9 violations in RecurringEventGeneratorService"
```

---

## Task 3: Fix PHPStan violations in BudgetStateProvider

**Files:**
- Modify: `backend/src/State/BudgetStateProvider.php`

Two issues: `foreach` over `object|array|null` (not guaranteed iterable), and `getMonth()`/`getYear()`/`getId()` return `?int` passed to `int` parameters.

- [ ] **Step 1: Fix the collection branch — add iterable guard**

Replace the `if ($isCollection)` block in `provide()`:

```php
        if ($isCollection) {
            $budgets = $this->collectionProvider->provide($operation, $uriVariables, $context);
            if (is_iterable($budgets)) {
                foreach ($budgets as $budget) {
                    if ($budget instanceof Budget) {
                        $this->attachSpent($budget);
                    }
                }
            }
            return $budgets;
        }
```

- [ ] **Step 2: Fix attachSpent() — null guards on nullable fields**

Replace the entire `attachSpent()` method:

```php
    private function attachSpent(Budget $budget): void
    {
        $category = $budget->getCategory();
        if ($category === null) {
            return;
        }
        $categoryId = $category->getId();
        $month = $budget->getMonth();
        $year = $budget->getYear();
        if ($categoryId === null || $month === null || $year === null) {
            return;
        }
        /** @var User $user */
        $user = $this->security->getUser();
        $spent = $this->transactionRepository->getSpentForBudget($categoryId, $month, $year, $user);
        $budget->setSpent($spent);
    }
```

- [ ] **Step 3: Verify**

```bash
docker compose exec backend vendor/bin/phpstan analyse --no-progress src/State/BudgetStateProvider.php
```

Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add backend/src/State/BudgetStateProvider.php
git commit -m "fix: resolve PHPStan level-9 violations in BudgetStateProvider"
```

---

## Task 4: Fix PHPStan violations in UpdateExchangeRatesCommand and controllers

**Files:**
- Modify: `backend/src/Command/UpdateExchangeRatesCommand.php`
- Modify: `backend/src/Controller/AuthController.php`
- Modify: `backend/src/Controller/PlanController.php`

All three involve accessing keys on `mixed`-typed values from `toArray()` or `json_decode()`.

- [ ] **Step 1: Fix UpdateExchangeRatesCommand — type-annotate rates array**

In `execute()`, replace:

```php
        $rates = $data['rates'] ?? [];
        $repo  = $this->em->getRepository(ExchangeRate::class);
```

With:

```php
        /** @var array<string, float> $rates */
        $rates = is_array($data['rates'] ?? null) ? ($data['rates'] ?? []) : [];
        $repo  = $this->em->getRepository(ExchangeRate::class);
```

- [ ] **Step 2: Fix AuthController::register() and patchMe() — annotate json_decode result**

In `register()`, replace:

```php
        $data = json_decode($request->getContent(), true) ?? [];
```

With:

```php
        /** @var array<string, mixed> $data */
        $data = json_decode($request->getContent(), true) ?? [];
```

Apply the same `/** @var array<string, mixed> $data */` annotation to `patchMe()`.

- [ ] **Step 3: Fix PlanController::confirm() — annotate json_decode result**

Replace:

```php
        $data = json_decode($request->getContent(), true);
```

With:

```php
        /** @var array<string, mixed> $data */
        $data = json_decode($request->getContent(), true) ?? [];
```

Also update the lines that read `$data['amount']` and `$data['accountId']` and `$data['date']` to use `$data` directly (same array, no structural change needed since the `?? []` means `$data` is now always an array).

- [ ] **Step 4: Verify these three files**

```bash
docker compose exec backend vendor/bin/phpstan analyse --no-progress \
  src/Command/UpdateExchangeRatesCommand.php \
  src/Controller/AuthController.php \
  src/Controller/PlanController.php
```

Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add backend/src/Command/UpdateExchangeRatesCommand.php \
        backend/src/Controller/AuthController.php \
        backend/src/Controller/PlanController.php
git commit -m "fix: resolve PHPStan level-9 violations in command and controllers"
```

---

## Task 5: Fix PHPStan violations in existing test files and verify full clean run

**Files:**
- Modify: `backend/tests/Repository/ExchangeRateRepositoryTest.php`
- Modify: `backend/tests/Controller/StatsControllerTest.php`

`EntityManager::getRepository(EntityClass::class)` returns `ObjectRepository<T>`, not the concrete repository class. At level 9, calling repository-specific methods (like `convert()`) on `ObjectRepository` fails. Fix: add `@var` annotations.

- [ ] **Step 1: Fix ExchangeRateRepositoryTest — annotate repo assignment**

In `setUp()`, replace:

```php
        $this->repo = $this->em->getRepository(ExchangeRate::class);
```

With:

```php
        /** @var \App\Repository\ExchangeRateRepository $this->repo */
        $this->repo = $this->em->getRepository(ExchangeRate::class);
```

And update the property declaration to `private ExchangeRateRepository $repo;` if it isn't already typed that way.

- [ ] **Step 2: Fix StatsControllerTest — annotate User fetch**

In `registerAndGetToken()`, the `$data['token']` and `$data['user']['id']` accesses — add annotation before `$data`:

```php
        /** @var array{token: string, user: array{id: int}} $data */
        $data = json_decode($client->getResponse()->getContent(), true);
```

Apply the same pattern in any other place in the test where `json_decode` result keys are accessed.

- [ ] **Step 3: Run full PHPStan on all paths and fix any remaining violations**

```bash
docker compose exec backend vendor/bin/phpstan analyse --no-progress
```

If any violations remain, fix them following the same pattern:
- `mixed` accessed as array → add `/** @var array<string, mixed> $var */` before the access
- `object|null` method called without null check → add null guard
- Nullable type passed as non-nullable → use `?? default` or assertion

- [ ] **Step 4: Commit all PHPStan fixes**

```bash
git add backend/tests/Repository/ExchangeRateRepositoryTest.php \
        backend/tests/Controller/StatsControllerTest.php
git commit -m "fix: resolve PHPStan level-9 violations in existing test files"
```

- [ ] **Step 5: Commit phpstan.neon and updated composer.json**

```bash
git add backend/phpstan.neon backend/composer.json backend/composer.lock
git commit -m "feat: add PHPStan level-9 static analysis"
```

---

## Task 6: Unit tests for RecurringEventGeneratorService

**Files:**
- Create: `backend/tests/Unit/Service/RecurringEventGeneratorServiceTest.php`

Tests the date computation logic via the public `generate()` API. `PlannedItemRepository` and `EntityManager` are mocked — no DB required.

- [ ] **Step 1: Write the test file**

```php
<?php

namespace App\Tests\Unit\Service;

use App\Entity\RecurringEvent;
use App\Entity\User;
use App\Repository\PlannedItemRepository;
use App\Service\RecurringEventGeneratorService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;

class RecurringEventGeneratorServiceTest extends TestCase
{
    private function makeEvent(
        string $startDate,
        string $unit,
        int $every,
        ?int $dayOfMonth = null,
    ): RecurringEvent {
        $event = new RecurringEvent();
        $event->setStartDate(new \DateTimeImmutable($startDate));
        $event->setRepeatUnit($unit);
        $event->setRepeatEvery($every);
        if ($dayOfMonth !== null) {
            $event->setDayOfMonth($dayOfMonth);
        }
        $event->setName('Test');
        $event->setAmount(100.0);
        $event->setType('EXPENSE');
        $event->setUser(new User());
        return $event;
    }

    public function testNextDateDays(): void
    {
        $persisted = [];
        $repo = $this->createMock(PlannedItemRepository::class);
        $repo->method('existsForEventOnDate')->willReturn(false);
        $em = $this->createMock(EntityManagerInterface::class);
        $em->method('persist')->willReturnCallback(function (object $item) use (&$persisted): void {
            $persisted[] = $item;
        });
        $service = new RecurringEventGeneratorService($repo, $em);

        $service->generate($this->makeEvent('2026-01-01', 'days', 7), new \DateTimeImmutable('2026-01-22'));

        $this->assertCount(4, $persisted);
        $this->assertSame('2026-01-01', $persisted[0]->getDueDate()->format('Y-m-d'));
        $this->assertSame('2026-01-22', $persisted[3]->getDueDate()->format('Y-m-d'));
    }

    public function testNextDateWeeks(): void
    {
        $persisted = [];
        $repo = $this->createMock(PlannedItemRepository::class);
        $repo->method('existsForEventOnDate')->willReturn(false);
        $em = $this->createMock(EntityManagerInterface::class);
        $em->method('persist')->willReturnCallback(function (object $item) use (&$persisted): void {
            $persisted[] = $item;
        });
        $service = new RecurringEventGeneratorService($repo, $em);

        $service->generate($this->makeEvent('2026-01-01', 'weeks', 2), new \DateTimeImmutable('2026-01-28'));

        $this->assertCount(2, $persisted);
        $this->assertSame('2026-01-01', $persisted[0]->getDueDate()->format('Y-m-d'));
        $this->assertSame('2026-01-15', $persisted[1]->getDueDate()->format('Y-m-d'));
    }

    public function testNextDateMonths(): void
    {
        $persisted = [];
        $repo = $this->createMock(PlannedItemRepository::class);
        $repo->method('existsForEventOnDate')->willReturn(false);
        $em = $this->createMock(EntityManagerInterface::class);
        $em->method('persist')->willReturnCallback(function (object $item) use (&$persisted): void {
            $persisted[] = $item;
        });
        $service = new RecurringEventGeneratorService($repo, $em);

        $service->generate($this->makeEvent('2026-01-15', 'months', 1), new \DateTimeImmutable('2026-03-15'));

        $this->assertCount(3, $persisted);
        $this->assertSame('2026-03-15', $persisted[2]->getDueDate()->format('Y-m-d'));
    }

    public function testNextDateYears(): void
    {
        $persisted = [];
        $repo = $this->createMock(PlannedItemRepository::class);
        $repo->method('existsForEventOnDate')->willReturn(false);
        $em = $this->createMock(EntityManagerInterface::class);
        $em->method('persist')->willReturnCallback(function (object $item) use (&$persisted): void {
            $persisted[] = $item;
        });
        $service = new RecurringEventGeneratorService($repo, $em);

        $service->generate($this->makeEvent('2026-01-15', 'years', 1), new \DateTimeImmutable('2028-01-15'));

        $this->assertCount(3, $persisted);
        $this->assertSame('2028-01-15', $persisted[2]->getDueDate()->format('Y-m-d'));
    }

    public function testPinToDayEndOfMonth(): void
    {
        $persisted = [];
        $repo = $this->createMock(PlannedItemRepository::class);
        $repo->method('existsForEventOnDate')->willReturn(false);
        $em = $this->createMock(EntityManagerInterface::class);
        $em->method('persist')->willReturnCallback(function (object $item) use (&$persisted): void {
            $persisted[] = $item;
        });
        $service = new RecurringEventGeneratorService($repo, $em);

        $service->generate($this->makeEvent('2026-01-31', 'months', 1, 31), new \DateTimeImmutable('2026-02-28'));

        $this->assertCount(2, $persisted);
        $this->assertSame('2026-01-31', $persisted[0]->getDueDate()->format('Y-m-d'));
        $this->assertSame('2026-02-28', $persisted[1]->getDueDate()->format('Y-m-d'));
    }

    public function testPinToDayLeapYear(): void
    {
        $persisted = [];
        $repo = $this->createMock(PlannedItemRepository::class);
        $repo->method('existsForEventOnDate')->willReturn(false);
        $em = $this->createMock(EntityManagerInterface::class);
        $em->method('persist')->willReturnCallback(function (object $item) use (&$persisted): void {
            $persisted[] = $item;
        });
        $service = new RecurringEventGeneratorService($repo, $em);

        $service->generate($this->makeEvent('2024-01-31', 'months', 1, 31), new \DateTimeImmutable('2024-02-29'));

        $this->assertCount(2, $persisted);
        $this->assertSame('2024-02-29', $persisted[1]->getDueDate()->format('Y-m-d'));
    }

    public function testGenerateIdempotent(): void
    {
        $repo = $this->createMock(PlannedItemRepository::class);
        $repo->method('existsForEventOnDate')->willReturn(true);
        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->never())->method('flush');
        $service = new RecurringEventGeneratorService($repo, $em);

        $count = $service->generate($this->makeEvent('2026-01-01', 'days', 1), new \DateTimeImmutable('2026-01-03'));

        $this->assertSame(0, $count);
    }

    public function testGenerateReturnsCount(): void
    {
        $repo = $this->createMock(PlannedItemRepository::class);
        $repo->method('existsForEventOnDate')->willReturn(false);
        $em = $this->createMock(EntityManagerInterface::class);
        $service = new RecurringEventGeneratorService($repo, $em);

        $count = $service->generate($this->makeEvent('2026-01-01', 'days', 1), new \DateTimeImmutable('2026-01-03'));

        $this->assertSame(3, $count);
    }

    public function testGenerateFlushesOnce(): void
    {
        $repo = $this->createMock(PlannedItemRepository::class);
        $repo->method('existsForEventOnDate')->willReturn(false);
        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('flush');
        $service = new RecurringEventGeneratorService($repo, $em);

        $service->generate($this->makeEvent('2026-01-01', 'days', 1), new \DateTimeImmutable('2026-01-03'));
    }
}
```

- [ ] **Step 2: Run the tests**

```bash
docker compose exec backend vendor/bin/phpunit tests/Unit/Service/RecurringEventGeneratorServiceTest.php --testdox
```

Expected: 9 tests pass. If any fail, the logic has a bug — read the failure message and fix the test or the production code as appropriate.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/Unit/Service/RecurringEventGeneratorServiceTest.php
git commit -m "test: add unit tests for RecurringEventGeneratorService date logic"
```

---

## Task 7: Unit tests for BudgetStateProvider

**Files:**
- Create: `backend/tests/Unit/State/BudgetStateProviderTest.php`

Mocks `ProviderInterface`, `TransactionRepository`, and `Security`. Uses real API Platform `Get`/`GetCollection` operation objects to distinguish item vs collection paths.

- [ ] **Step 1: Write the test file**

```php
<?php

namespace App\Tests\Unit\State;

use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\State\ProviderInterface;
use App\Entity\Budget;
use App\Entity\Category;
use App\Entity\User;
use App\Repository\TransactionRepository;
use App\State\BudgetStateProvider;
use PHPUnit\Framework\TestCase;
use Symfony\Bundle\SecurityBundle\Security;

class BudgetStateProviderTest extends TestCase
{
    private function makeBudgetWithCategory(): Budget
    {
        $category = new Category();
        $category->setName('Food')->setType('EXPENSE');

        $budget = new Budget();
        $budget->setCategory($category)->setMonth(5)->setYear(2026)->setAmount(500.0);
        return $budget;
    }

    public function testCollectionCallsAttachSpentOnEach(): void
    {
        $budget1 = $this->makeBudgetWithCategory();
        $budget2 = $this->makeBudgetWithCategory();

        $collectionProvider = $this->createMock(ProviderInterface::class);
        $collectionProvider->method('provide')->willReturn([$budget1, $budget2]);

        $transactionRepo = $this->createMock(TransactionRepository::class);
        $transactionRepo->expects($this->exactly(2))->method('getSpentForBudget')->willReturn(100.0);

        $security = $this->createMock(Security::class);
        $security->method('getUser')->willReturn(new User());

        $provider = new BudgetStateProvider(
            $transactionRepo,
            $this->createMock(ProviderInterface::class),
            $collectionProvider,
            $security,
        );
        $provider->provide(new GetCollection(), [], []);
    }

    public function testItemCallsAttachSpent(): void
    {
        $budget = $this->makeBudgetWithCategory();

        $itemProvider = $this->createMock(ProviderInterface::class);
        $itemProvider->method('provide')->willReturn($budget);

        $transactionRepo = $this->createMock(TransactionRepository::class);
        $transactionRepo->expects($this->once())->method('getSpentForBudget')->willReturn(150.0);

        $security = $this->createMock(Security::class);
        $security->method('getUser')->willReturn(new User());

        $provider = new BudgetStateProvider(
            $transactionRepo,
            $itemProvider,
            $this->createMock(ProviderInterface::class),
            $security,
        );
        $provider->provide(new Get(), [], []);
    }

    public function testNullCategorySkipsSpent(): void
    {
        $budget = new Budget();
        $budget->setMonth(5)->setYear(2026)->setAmount(500.0);

        $itemProvider = $this->createMock(ProviderInterface::class);
        $itemProvider->method('provide')->willReturn($budget);

        $transactionRepo = $this->createMock(TransactionRepository::class);
        $transactionRepo->expects($this->never())->method('getSpentForBudget');

        $security = $this->createMock(Security::class);
        $security->method('getUser')->willReturn(new User());

        $provider = new BudgetStateProvider(
            $transactionRepo,
            $itemProvider,
            $this->createMock(ProviderInterface::class),
            $security,
        );
        $provider->provide(new Get(), [], []);
    }
}
```

- [ ] **Step 2: Run the tests**

```bash
docker compose exec backend vendor/bin/phpunit tests/Unit/State/BudgetStateProviderTest.php --testdox
```

Expected: 3 tests pass. If `Get`/`GetCollection` cannot be instantiated without arguments, replace with `$this->createMock(CollectionOperationInterface::class)` / `$this->createMock(Operation::class)` respectively.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/Unit/State/BudgetStateProviderTest.php
git commit -m "test: add unit tests for BudgetStateProvider"
```

---

## Task 8: Integration tests for TransactionRepository

**Files:**
- Create: `backend/tests/Integration/Repository/TransactionRepositoryTest.php`

Tests `getMonthlyTotal()` and `getSpentForBudget()` against the real test DB.

- [ ] **Step 1: Write the test file**

```php
<?php

namespace App\Tests\Integration\Repository;

use App\Entity\Account;
use App\Entity\Category;
use App\Entity\ExchangeRate;
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
        $this->em = $kernel->getContainer()->get('doctrine.orm.entity_manager');
        $this->repo = static::getContainer()->get(TransactionRepository::class);

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
```

- [ ] **Step 2: Run the tests**

```bash
docker compose exec backend vendor/bin/phpunit tests/Integration/Repository/TransactionRepositoryTest.php --testdox
```

Expected: 5 tests pass.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/Integration/Repository/TransactionRepositoryTest.php
git commit -m "test: add integration tests for TransactionRepository"
```

---

## Task 9: Integration tests for AccountRepository

**Files:**
- Create: `backend/tests/Integration/Repository/AccountRepositoryTest.php`

Tests `getTotalBalance()` including multi-currency conversion, archived exclusion, and missing rate reporting.

- [ ] **Step 1: Write the test file**

```php
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
        $this->em = $kernel->getContainer()->get('doctrine.orm.entity_manager');
        $this->repo = static::getContainer()->get(AccountRepository::class);

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
```

- [ ] **Step 2: Run the tests**

```bash
docker compose exec backend vendor/bin/phpunit tests/Integration/Repository/AccountRepositoryTest.php --testdox
```

Expected: 4 tests pass. If `setIsArchived` doesn't exist on Account, check the entity — the field is `$isArchived` with setter `setIsArchived(bool)`.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/Integration/Repository/AccountRepositoryTest.php
git commit -m "test: add integration tests for AccountRepository"
```

---

## Task 10: Integration tests for PlanController

**Files:**
- Create: `backend/tests/Integration/Controller/PlanControllerTest.php`

WebTestCase tests for `POST /api/plan/confirm/{id}` and `POST /api/plan/generate_month`. Registers a user via the API to get a JWT, creates PlannedItems directly via EM.

- [ ] **Step 1: Write the test file**

```php
<?php

namespace App\Tests\Integration\Controller;

use App\Entity\Account;
use App\Entity\PlannedItem;
use App\Entity\RecurringEvent;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class PlanControllerTest extends WebTestCase
{
    private const PASSWORD = 'Secret123!@#';

    protected function setUp(): void
    {
        parent::setUp();
        static::ensureKernelShutdown();
        $kernel = static::bootKernel();
        $em = $kernel->getContainer()->get('doctrine.orm.entity_manager');
        $em->getConnection()->executeStatement('DELETE FROM transaction');
        $em->getConnection()->executeStatement('DELETE FROM planned_item');
        $em->getConnection()->executeStatement('DELETE FROM recurring_event');
        $em->getConnection()->executeStatement('DELETE FROM account');
        $em->getConnection()->executeStatement('DELETE FROM "user"');
        static::ensureKernelShutdown();
    }

    private function registerAndGetToken(object $client, string $email = 'plan@example.com'): array
    {
        $client->request('POST', '/api/auth/register', [], [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['email' => $email, 'password' => self::PASSWORD, 'displayName' => 'Plan'])
        );
        /** @var array{token: string, user: array{id: int}} $data */
        $data = json_decode($client->getResponse()->getContent(), true);
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

        $em = static::getContainer()->get('doctrine.orm.entity_manager');
        /** @var User $user */
        $user = $em->getRepository(User::class)->find($userId);
        $account = (new Account())->setName('Main')->setType('CHECKING')->setCurrency('USD')->setBalance(1000.0)->setColor('#000')->setIcon('bank')->setUser($user);
        $em->persist($account);
        $em->flush();

        $item = $this->createPlannedItem($em, $user, $account, 300.0);

        $client->request('POST', '/api/plan/confirm/' . $item->getId(), [], [],
            ['CONTENT_TYPE' => 'application/json', 'HTTP_AUTHORIZATION' => "Bearer $token"],
            json_encode(['amount' => 300.0, 'accountId' => $account->getId()])
        );

        $this->assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertTrue($data['isPaid']);
        $this->assertEqualsWithDelta(300.0, $data['paidAmount'], 0.01);
        $this->assertNotNull($data['transactionId']);

        $em->refresh($account);
        $this->assertEqualsWithDelta(700.0, $account->getBalance(), 0.01);
    }

    public function testConfirmWrongUser(): void
    {
        $client = static::createClient();
        [$token] = $this->registerAndGetToken($client, 'user1@example.com');
        [, $user2Id] = $this->registerAndGetToken($client, 'user2@example.com');

        $em = static::getContainer()->get('doctrine.orm.entity_manager');
        /** @var User $user2 */
        $user2 = $em->getRepository(User::class)->find($user2Id);
        $account = (new Account())->setName('A')->setType('CHECKING')->setCurrency('USD')->setBalance(0.0)->setColor('#000')->setIcon('bank')->setUser($user2);
        $em->persist($account);
        $em->flush();
        $item = $this->createPlannedItem($em, $user2, $account, 100.0);

        $client->request('POST', '/api/plan/confirm/' . $item->getId(), [], [],
            ['CONTENT_TYPE' => 'application/json', 'HTTP_AUTHORIZATION' => "Bearer $token"],
            json_encode(['amount' => 100.0, 'accountId' => $account->getId()])
        );

        $this->assertResponseStatusCodeSame(404);
    }

    public function testConfirmInvalidAccount(): void
    {
        $client = static::createClient();
        [$token, $userId] = $this->registerAndGetToken($client);

        $em = static::getContainer()->get('doctrine.orm.entity_manager');
        /** @var User $user */
        $user = $em->getRepository(User::class)->find($userId);
        $account = (new Account())->setName('A')->setType('CHECKING')->setCurrency('USD')->setBalance(0.0)->setColor('#000')->setIcon('bank')->setUser($user);
        $em->persist($account);
        $em->flush();
        $item = $this->createPlannedItem($em, $user, $account, 100.0);

        $client->request('POST', '/api/plan/confirm/' . $item->getId(), [], [],
            ['CONTENT_TYPE' => 'application/json', 'HTTP_AUTHORIZATION' => "Bearer $token"],
            json_encode(['amount' => 100.0, 'accountId' => 99999])
        );

        $this->assertResponseStatusCodeSame(400);
    }

    public function testConfirmMarksPaidWhenFull(): void
    {
        $client = static::createClient();
        [$token, $userId] = $this->registerAndGetToken($client);

        $em = static::getContainer()->get('doctrine.orm.entity_manager');
        /** @var User $user */
        $user = $em->getRepository(User::class)->find($userId);
        $account = (new Account())->setName('A')->setType('CHECKING')->setCurrency('USD')->setBalance(500.0)->setColor('#000')->setIcon('bank')->setUser($user);
        $em->persist($account);
        $em->flush();
        $item = $this->createPlannedItem($em, $user, $account, 200.0);

        $client->request('POST', '/api/plan/confirm/' . $item->getId(), [], [],
            ['CONTENT_TYPE' => 'application/json', 'HTTP_AUTHORIZATION' => "Bearer $token"],
            json_encode(['amount' => 200.0, 'accountId' => $account->getId()])
        );

        $this->assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertTrue($data['isPaid']);
    }

    public function testGenerateMonthHappyPath(): void
    {
        $client = static::createClient();
        [$token] = $this->registerAndGetToken($client);

        $client->request('POST', '/api/plan/generate_month', [], [],
            ['CONTENT_TYPE' => 'application/json', 'HTTP_AUTHORIZATION' => "Bearer $token"],
            json_encode(['month' => 5, 'year' => 2026])
        );

        $this->assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('generated', $data);
        $this->assertIsInt($data['generated']);
    }

    public function testGenerateMonthInvalidMonth(): void
    {
        $client = static::createClient();
        [$token] = $this->registerAndGetToken($client);

        $client->request('POST', '/api/plan/generate_month', [], [],
            ['CONTENT_TYPE' => 'application/json', 'HTTP_AUTHORIZATION' => "Bearer $token"],
            json_encode(['month' => 13, 'year' => 2026])
        );

        $this->assertResponseStatusCodeSame(400);
    }
}
```

- [ ] **Step 2: Run the tests**

```bash
docker compose exec backend vendor/bin/phpunit tests/Integration/Controller/PlanControllerTest.php --testdox
```

Expected: 6 tests pass.

- [ ] **Step 3: Run the full test suite to verify no regressions**

```bash
docker compose exec backend vendor/bin/phpunit --testdox
```

Expected: all tests pass (existing + new).

- [ ] **Step 4: Commit**

```bash
git add backend/tests/Integration/Controller/PlanControllerTest.php
git commit -m "test: add integration tests for PlanController"
```

---

## Task 11: Create phpunit.ci.xml

**Files:**
- Create: `backend/phpunit.ci.xml`

Identical to `phpunit.dist.xml` but uses `localhost:5432` instead of `db:5432`. Required because `force="true"` in `phpunit.dist.xml` overrides OS env vars — the only way to change the hostname for CI is a separate config file.

- [ ] **Step 1: Create the file**

```xml
<?xml version="1.0" encoding="UTF-8"?>

<!-- CI-specific config: uses localhost:5432 (GitHub Actions service) instead of db:5432 (Docker) -->
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="vendor/phpunit/phpunit/phpunit.xsd"
         colors="true"
         failOnDeprecation="true"
         failOnNotice="true"
         failOnWarning="true"
         bootstrap="tests/bootstrap.php"
         cacheDirectory=".phpunit.cache"
>
    <php>
        <ini name="display_errors" value="1" />
        <ini name="error_reporting" value="-1" />
        <env name="APP_ENV" value="test" force="true" />
        <env name="KERNEL_CLASS" value="App\Kernel" force="true" />
        <env name="DATABASE_URL" value="postgresql://user:password@localhost:5432/budget_test?serverVersion=16&amp;charset=utf8" force="true" />
        <env name="SHELL_VERBOSITY" value="-1" force="true" />
    </php>

    <testsuites>
        <testsuite name="Project Test Suite">
            <directory>tests</directory>
        </testsuite>
    </testsuites>

    <source ignoreSuppressionOfDeprecations="true"
            ignoreIndirectDeprecations="true"
            restrictNotices="true"
            restrictWarnings="true"
    >
        <include>
            <directory>src</directory>
        </include>

        <deprecationTrigger>
            <method>Doctrine\Deprecations\Deprecation::trigger</method>
            <method>Doctrine\Deprecations\Deprecation::delegateTriggerToBackend</method>
            <function>trigger_deprecation</function>
        </deprecationTrigger>
    </source>

    <extensions>
    </extensions>
</phpunit>
```

- [ ] **Step 2: Commit**

```bash
git add backend/phpunit.ci.xml
git commit -m "feat: add phpunit.ci.xml for GitHub Actions (localhost:5432)"
```

---

## Task 12: Create GitHub Actions CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

Two parallel jobs: `static-analysis` (PHPStan, no DB) and `tests` (PHPUnit, PostgreSQL 16 service). Both run on every pull request targeting `master`.

- [ ] **Step 1: Create the directory**

Run from the repository root (not inside Docker):

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Create .github/workflows/ci.yml**

```yaml
name: CI

on:
  pull_request:
    branches: [master]

jobs:
  static-analysis:
    name: PHPStan
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4

      - uses: shivammathur/setup-php@v2
        with:
          php-version: '8.3'
          extensions: intl, pdo_pgsql
          coverage: none

      - uses: actions/cache@v4
        with:
          path: backend/vendor
          key: ${{ runner.os }}-composer-${{ hashFiles('backend/composer.lock') }}
          restore-keys: ${{ runner.os }}-composer-

      - name: Install dependencies
        run: composer install --no-interaction --prefer-dist

      - name: Warm up dev cache (generates container XML for phpstan-symfony)
        run: php bin/console cache:warmup --env=dev
        env:
          APP_ENV: dev
          APP_SECRET: ci-placeholder
          DATABASE_URL: postgresql://user:password@localhost:5432/budget?serverVersion=16&charset=utf8
          JWT_SECRET_KEY: '%kernel.project_dir%/config/jwt/private.pem'
          JWT_PUBLIC_KEY: '%kernel.project_dir%/config/jwt/public.pem'
          JWT_PASSPHRASE: ci

      - name: Run PHPStan
        run: vendor/bin/phpstan analyse --no-progress

  tests:
    name: PHPUnit
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: user
          POSTGRES_PASSWORD: password
          POSTGRES_DB: budget_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4

      - uses: shivammathur/setup-php@v2
        with:
          php-version: '8.3'
          extensions: intl, pdo_pgsql
          coverage: none

      - uses: actions/cache@v4
        with:
          path: backend/vendor
          key: ${{ runner.os }}-composer-${{ hashFiles('backend/composer.lock') }}
          restore-keys: ${{ runner.os }}-composer-

      - name: Install dependencies
        run: composer install --no-interaction --prefer-dist

      - name: Generate JWT keypair
        run: php bin/console lexik:jwt:generate-keypair --skip-if-exists
        env:
          APP_ENV: test
          APP_SECRET: ci-placeholder
          JWT_PASSPHRASE: ${{ secrets.JWT_PASSPHRASE }}

      - name: Run PHPUnit
        run: vendor/bin/phpunit --configuration phpunit.ci.xml
        env:
          APP_SECRET: ci-placeholder
          JWT_PASSPHRASE: ${{ secrets.JWT_PASSPHRASE }}
```

**Before merging this:** add `JWT_PASSPHRASE` as a GitHub Actions repository secret (Settings → Secrets and variables → Actions → New repository secret). The value can be any string (e.g. `test-ci-passphrase`) — it's only used to generate ephemeral keys during the CI run.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "feat: add GitHub Actions CI workflow (PHPStan + PHPUnit on pull requests)"
```

- [ ] **Step 4: Push and open a test pull request**

```bash
git push origin master
```

Create a test branch and PR to verify CI triggers and both jobs go green. Check the Actions tab at `https://github.com/brzoza37/budget/actions`.
