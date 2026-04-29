<?php

namespace App\Repository;

use App\Entity\PlannedPayment;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<PlannedPayment>
 *
 * @method PlannedPayment|null find($id, $lockMode = null, $lockVersion = null)
 * @method PlannedPayment|null findOneBy(array $criteria, array $orderBy = null)
 * @method PlannedPayment[]    findAll()
 * @method PlannedPayment[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class PlannedPaymentRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, PlannedPayment::class);
    }

    public function getUnpaidExpensesTotal(): float
    {
        $result = $this->createQueryBuilder('p')
            ->select('COALESCE(SUM(p.amount), 0) as total')
            ->where('p.isPaid = false')
            ->getQuery()
            ->getSingleResult();

        return (float) $result['total'];
    }
}
