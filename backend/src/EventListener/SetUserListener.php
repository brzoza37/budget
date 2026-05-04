<?php

namespace App\EventListener;

use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsDoctrineListener;
use Doctrine\ORM\Events;
use Doctrine\Persistence\Event\LifecycleEventArgs;
use Symfony\Bundle\SecurityBundle\Security;

#[AsDoctrineListener(event: Events::prePersist)]
class SetUserListener
{
    public function __construct(private readonly Security $security) {}

    /** @param \Doctrine\Persistence\Event\LifecycleEventArgs<\Doctrine\ORM\EntityManagerInterface> $args */
    public function prePersist(LifecycleEventArgs $args): void
    {
        $entity = $args->getObject();
        if (!method_exists($entity, 'setUser') || !method_exists($entity, 'getUser')) {
            return;
        }
        if ($entity->getUser() !== null) {
            return;
        }
        $user = $this->security->getUser();
        if ($user instanceof User) {
            $entity->setUser($user);
        }
    }
}
