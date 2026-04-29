<?php

namespace App\State;

use ApiPlatform\Metadata\CollectionOperationInterface;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Entity\Budget;
use App\Repository\TransactionRepository;

final class BudgetStateProvider implements ProviderInterface
{
    public function __construct(
        private readonly TransactionRepository $transactionRepository,
        private readonly ProviderInterface $itemProvider,
        private readonly ProviderInterface $collectionProvider,
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        $isCollection = $operation instanceof CollectionOperationInterface;

        if ($isCollection) {
            $budgets = $this->collectionProvider->provide($operation, $uriVariables, $context);
            foreach ($budgets as $budget) {
                $this->attachSpent($budget);
            }
            return $budgets;
        }

        $budget = $this->itemProvider->provide($operation, $uriVariables, $context);
        if ($budget instanceof Budget) {
            $this->attachSpent($budget);
        }
        return $budget;
    }

    private function attachSpent(Budget $budget): void
    {
        if ($budget->getCategory() === null) {
            return;
        }
        $spent = $this->transactionRepository->getSpentForBudget(
            $budget->getCategory()->getId(),
            $budget->getMonth(),
            $budget->getYear(),
        );
        $budget->setSpent($spent);
    }
}
