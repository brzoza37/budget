<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\RecurringEvent;
use App\Repository\PlannedItemRepository;
use Doctrine\ORM\EntityManagerInterface;

/** @implements ProcessorInterface<mixed, void> */
final class RecurringEventDeleteProcessor implements ProcessorInterface
{
    /**
     * @param ProcessorInterface<mixed, void> $innerProcessor
     */
    public function __construct(
        private readonly ProcessorInterface $innerProcessor,
        private readonly PlannedItemRepository $plannedItemRepository,
        private readonly EntityManagerInterface $em,
    ) {}

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): void
    {
        if (!$data instanceof RecurringEvent) {
            $this->innerProcessor->process($data, $operation, $uriVariables, $context);
            return;
        }

        // Remove all future unpaid instances
        $unpaidItems = $this->plannedItemRepository->findUnpaidByRecurringEvent($data);
        foreach ($unpaidItems as $item) {
            $this->em->remove($item);
        }
        $this->em->flush();

        // Delegate to the standard delete processor
        $this->innerProcessor->process($data, $operation, $uriVariables, $context);
    }
}
