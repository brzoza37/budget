<?php

namespace App\Service;

use App\Entity\PlannedItem;
use App\Entity\RecurringEvent;
use App\Repository\PlannedItemRepository;
use Doctrine\ORM\EntityManagerInterface;

class RecurringEventGeneratorService
{
    public function __construct(
        private readonly PlannedItemRepository $plannedItemRepository,
        private readonly EntityManagerInterface $em,
    ) {}

    /**
     * Generates PlannedItem instances for the given event up to $until date.
     * Idempotent: skips dates where an instance already exists.
     *
     * @return int number of new instances created
     */
    public function generate(RecurringEvent $event, \DateTimeImmutable $until): int
    {
        $created = 0;
        $dates = $this->computeDates($event, $until);

        foreach ($dates as $date) {
            if ($this->plannedItemRepository->existsForEventOnDate($event, $date)) {
                continue;
            }

            $item = new PlannedItem();
            $item->setName($event->getName());
            $item->setAmount($event->getAmount());
            $item->setType($event->getType());
            $item->setCategory($event->getCategory());
            $item->setAccount($event->getAccount());
            $item->setDueDate($date);
            $item->setRecurringEvent($event);
            $item->setUser($event->getUser());
            $item->setNote($event->getNote());

            $this->em->persist($item);
            $created++;
        }

        if ($created > 0) {
            $this->em->flush();
        }

        return $created;
    }

    /**
     * Generates instances for all events that have an occurrence in the given month.
     *
     * @param RecurringEvent[] $events
     * @return int total instances created
     */
    public function generateForMonth(array $events, int $month, int $year): int
    {
        $monthStart = new \DateTimeImmutable(sprintf('%d-%02d-01', $year, $month));
        $monthEnd = $monthStart->modify('last day of this month')->setTime(23, 59, 59);
        $until = max(new \DateTimeImmutable('+12 months'), $monthEnd);

        $total = 0;
        foreach ($events as $event) {
            $total += $this->generate($event, $until);
        }
        return $total;
    }

    /** @return \DateTimeImmutable[] */
    private function computeDates(RecurringEvent $event, \DateTimeImmutable $until): array
    {
        $current = $event->getStartDate();
        if ($current === null) {
            return [];
        }

        $dates = [];

        // Safety cap: never generate more than 500 instances per call
        $limit = 500;
        $count = 0;

        while ($current <= $until && $count < $limit) {
            $dates[] = $current;
            $current = $this->nextDate($event, $current);
            $count++;
        }

        return $dates;
    }

    private function nextDate(RecurringEvent $event, \DateTimeImmutable $from): \DateTimeImmutable
    {
        $n = $event->getRepeatEvery();
        $unit = $event->getRepeatUnit();

        switch ($unit) {
            case 'days':
                return $from->modify("+{$n} days");
            case 'weeks':
                return $from->modify("+{$n} weeks");
            case 'months':
                $next = $from->modify("+{$n} months");
                if ($event->getDayOfMonth() !== null) {
                    $next = $this->pinToDay($next, $event->getDayOfMonth());
                }
                return $next;
            case 'years':
                $next = $from->modify("+{$n} years");
                if ($event->getDayOfMonth() !== null) {
                    $next = $this->pinToDay($next, $event->getDayOfMonth());
                }
                return $next;
            default:
                return $from->modify("+{$n} months");
        }
    }

    private function pinToDay(\DateTimeImmutable $date, int $day): \DateTimeImmutable
    {
        $daysInMonth = (int) $date->format('t');
        $actualDay = min($day, $daysInMonth);
        return $date->setDate((int) $date->format('Y'), (int) $date->format('n'), $actualDay)
                    ->setTime(0, 0, 0);
    }
}
