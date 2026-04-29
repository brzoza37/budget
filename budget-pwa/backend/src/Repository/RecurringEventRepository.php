<?php

namespace App\Repository;

use App\Entity\RecurringEvent;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<RecurringEvent>
 */
class RecurringEventRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, RecurringEvent::class);
    }

    /** @return RecurringEvent[] */
    public function findAllActive(): array
    {
        return $this->findAll();
    }
}
