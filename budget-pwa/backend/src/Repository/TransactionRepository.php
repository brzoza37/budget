<?php

namespace App\Repository;

use App\Entity\Transaction;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Transaction>
 *
 * @method Transaction|null find($id, $lockMode = null, $lockVersion = null)
 * @method Transaction|null findOneBy(array $criteria, array $orderBy = null)
 * @method Transaction[]    findAll()
 * @method Transaction[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class TransactionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Transaction::class);
    }

    public function getMonthlyTotal(string $type, int $month, int $year, User $user): float
    {
        $start = new \DateTimeImmutable(sprintf('%d-%02d-01', $year, $month));
        $end = $start->modify('first day of next month');

        $result = $this->createQueryBuilder('t')
            ->select('COALESCE(SUM(t.amount), 0) as total')
            ->where('t.type = :type')
            ->andWhere('t.date >= :start')
            ->andWhere('t.date < :end')
            ->andWhere('t.user = :user')
            ->setParameter('type', $type)
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->setParameter('user', $user)
            ->getQuery()
            ->getSingleResult();

        return (float) $result['total'];
    }

    public function getSpentForBudget(int $categoryId, int $month, int $year, User $user): float
    {
        $start = new \DateTimeImmutable(sprintf('%d-%02d-01', $year, $month));
        $end = $start->modify('first day of next month');

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
