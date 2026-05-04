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
        $repo = $this->createStub(PlannedItemRepository::class);
        $repo->method('existsForEventOnDate')->willReturn(false);
        $em = $this->createStub(EntityManagerInterface::class);
        $em->method('persist')->willReturnCallback(function (object $item) use (&$persisted): void {
            $persisted[] = $item;
        });
        $service = new RecurringEventGeneratorService($repo, $em);

        $service->generate($this->makeEvent('2026-01-01', 'days', 7), new \DateTimeImmutable('2026-01-22'));

        $this->assertCount(4, $persisted);
        $dueDate0 = $persisted[0]->getDueDate();
        $dueDate3 = $persisted[3]->getDueDate();
        $this->assertNotNull($dueDate0);
        $this->assertNotNull($dueDate3);
        $this->assertSame('2026-01-01', $dueDate0->format('Y-m-d'));
        $this->assertSame('2026-01-22', $dueDate3->format('Y-m-d'));
    }

    public function testNextDateWeeks(): void
    {
        $persisted = [];
        $repo = $this->createStub(PlannedItemRepository::class);
        $repo->method('existsForEventOnDate')->willReturn(false);
        $em = $this->createStub(EntityManagerInterface::class);
        $em->method('persist')->willReturnCallback(function (object $item) use (&$persisted): void {
            $persisted[] = $item;
        });
        $service = new RecurringEventGeneratorService($repo, $em);

        $service->generate($this->makeEvent('2026-01-01', 'weeks', 2), new \DateTimeImmutable('2026-01-28'));

        $this->assertCount(2, $persisted);
        $dueDate0 = $persisted[0]->getDueDate();
        $dueDate1 = $persisted[1]->getDueDate();
        $this->assertNotNull($dueDate0);
        $this->assertNotNull($dueDate1);
        $this->assertSame('2026-01-01', $dueDate0->format('Y-m-d'));
        $this->assertSame('2026-01-15', $dueDate1->format('Y-m-d'));
    }

    public function testNextDateMonths(): void
    {
        $persisted = [];
        $repo = $this->createStub(PlannedItemRepository::class);
        $repo->method('existsForEventOnDate')->willReturn(false);
        $em = $this->createStub(EntityManagerInterface::class);
        $em->method('persist')->willReturnCallback(function (object $item) use (&$persisted): void {
            $persisted[] = $item;
        });
        $service = new RecurringEventGeneratorService($repo, $em);

        $service->generate($this->makeEvent('2026-01-15', 'months', 1), new \DateTimeImmutable('2026-03-15'));

        $this->assertCount(3, $persisted);
        $dueDate2 = $persisted[2]->getDueDate();
        $this->assertNotNull($dueDate2);
        $this->assertSame('2026-03-15', $dueDate2->format('Y-m-d'));
    }

    public function testNextDateYears(): void
    {
        $persisted = [];
        $repo = $this->createStub(PlannedItemRepository::class);
        $repo->method('existsForEventOnDate')->willReturn(false);
        $em = $this->createStub(EntityManagerInterface::class);
        $em->method('persist')->willReturnCallback(function (object $item) use (&$persisted): void {
            $persisted[] = $item;
        });
        $service = new RecurringEventGeneratorService($repo, $em);

        $service->generate($this->makeEvent('2026-01-15', 'years', 1), new \DateTimeImmutable('2028-01-15'));

        $this->assertCount(3, $persisted);
        $dueDate2 = $persisted[2]->getDueDate();
        $this->assertNotNull($dueDate2);
        $this->assertSame('2028-01-15', $dueDate2->format('Y-m-d'));
    }

    public function testPinToDayEndOfMonth(): void
    {
        $persisted = [];
        $repo = $this->createStub(PlannedItemRepository::class);
        $repo->method('existsForEventOnDate')->willReturn(false);
        $em = $this->createStub(EntityManagerInterface::class);
        $em->method('persist')->willReturnCallback(function (object $item) use (&$persisted): void {
            $persisted[] = $item;
        });
        $service = new RecurringEventGeneratorService($repo, $em);

        $service->generate($this->makeEvent('2026-01-31', 'months', 1, 31), new \DateTimeImmutable('2026-02-28'));

        $this->assertCount(2, $persisted);
        $dueDate0 = $persisted[0]->getDueDate();
        $dueDate1 = $persisted[1]->getDueDate();
        $this->assertNotNull($dueDate0);
        $this->assertNotNull($dueDate1);
        $this->assertSame('2026-01-31', $dueDate0->format('Y-m-d'));
        $this->assertSame('2026-02-28', $dueDate1->format('Y-m-d'));
    }

    public function testPinToDayLeapYear(): void
    {
        $persisted = [];
        $repo = $this->createStub(PlannedItemRepository::class);
        $repo->method('existsForEventOnDate')->willReturn(false);
        $em = $this->createStub(EntityManagerInterface::class);
        $em->method('persist')->willReturnCallback(function (object $item) use (&$persisted): void {
            $persisted[] = $item;
        });
        $service = new RecurringEventGeneratorService($repo, $em);

        $service->generate($this->makeEvent('2024-01-31', 'months', 1, 31), new \DateTimeImmutable('2024-02-29'));

        $this->assertCount(2, $persisted);
        $dueDate1 = $persisted[1]->getDueDate();
        $this->assertNotNull($dueDate1);
        $this->assertSame('2024-02-29', $dueDate1->format('Y-m-d'));
    }

    public function testGenerateIdempotent(): void
    {
        $repo = $this->createStub(PlannedItemRepository::class);
        $repo->method('existsForEventOnDate')->willReturn(true);
        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->never())->method('flush');
        $service = new RecurringEventGeneratorService($repo, $em);

        $count = $service->generate($this->makeEvent('2026-01-01', 'days', 1), new \DateTimeImmutable('2026-01-03'));

        $this->assertSame(0, $count);
    }

    public function testGenerateReturnsCount(): void
    {
        $repo = $this->createStub(PlannedItemRepository::class);
        $repo->method('existsForEventOnDate')->willReturn(false);
        $em = $this->createStub(EntityManagerInterface::class);
        $service = new RecurringEventGeneratorService($repo, $em);

        $count = $service->generate($this->makeEvent('2026-01-01', 'days', 1), new \DateTimeImmutable('2026-01-03'));

        $this->assertSame(3, $count);
    }

    public function testGenerateFlushesOnce(): void
    {
        $repo = $this->createStub(PlannedItemRepository::class);
        $repo->method('existsForEventOnDate')->willReturn(false);
        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('flush');
        $service = new RecurringEventGeneratorService($repo, $em);

        $service->generate($this->makeEvent('2026-01-01', 'days', 1), new \DateTimeImmutable('2026-01-03'));
    }
}
