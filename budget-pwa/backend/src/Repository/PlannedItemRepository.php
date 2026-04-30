<?php

namespace App\Repository;

use App\Entity\PlannedItem;
use App\Entity\RecurringEvent;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<PlannedItem>
 */
class PlannedItemRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, PlannedItem::class);
    }

    public function getPlannedIncomeForMonth(int $month, int $year, User $user): float
    {
        $start = new \DateTimeImmutable(sprintf('%d-%02d-01', $year, $month));
        $end = $start->modify('first day of next month');

        $result = $this->createQueryBuilder('p')
            ->select('COALESCE(SUM(p.amount), 0) as total')
            ->where('p.type = :type')
            ->andWhere('p.isPaid = false')
            ->andWhere('p.dueDate >= :start')
            ->andWhere('p.dueDate < :end')
            ->andWhere('p.user = :user')
            ->setParameter('type', 'INCOME')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->setParameter('user', $user)
            ->getQuery()
            ->getSingleResult();

        return (float) $result['total'];
    }

    public function getPlannedExpensesForMonth(int $month, int $year, User $user): float
    {
        $start = new \DateTimeImmutable(sprintf('%d-%02d-01', $year, $month));
        $end = $start->modify('first day of next month');

        $result = $this->createQueryBuilder('p')
            ->select('COALESCE(SUM(p.amount), 0) as total')
            ->where('p.type = :type')
            ->andWhere('p.isPaid = false')
            ->andWhere('p.dueDate >= :start')
            ->andWhere('p.dueDate < :end')
            ->andWhere('p.user = :user')
            ->setParameter('type', 'EXPENSE')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->setParameter('user', $user)
            ->getQuery()
            ->getSingleResult();

        return (float) $result['total'];
    }

    /** @return PlannedItem[] */
    public function findUnpaidByRecurringEvent(RecurringEvent $event): array
    {
        return $this->createQueryBuilder('p')
            ->where('p.recurringEvent = :event')
            ->andWhere('p.isPaid = false')
            ->setParameter('event', $event)
            ->getQuery()
            ->getResult();
    }

    public function existsForEventOnDate(RecurringEvent $event, \DateTimeImmutable $date): bool
    {
        $start = $date->setTime(0, 0, 0);
        $end = $date->setTime(23, 59, 59);

        return (bool) $this->createQueryBuilder('p')
            ->select('COUNT(p.id)')
            ->where('p.recurringEvent = :event')
            ->andWhere('p.dueDate >= :start')
            ->andWhere('p.dueDate <= :end')
            ->setParameter('event', $event)
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->getQuery()
            ->getSingleScalarResult();
    }
}
