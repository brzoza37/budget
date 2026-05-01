<?php

namespace App\Repository;

use App\Entity\RecurringEvent;
use App\Entity\User;
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

    /** @return RecurringEvent[] */
    public function findAllActiveForUser(User $user): array
    {
        return $this->findBy(['user' => $user]);
    }
}
