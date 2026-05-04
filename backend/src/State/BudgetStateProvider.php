<?php

namespace App\State;

use ApiPlatform\Metadata\CollectionOperationInterface;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Entity\Budget;
use App\Entity\User;
use App\Repository\TransactionRepository;
use Symfony\Bundle\SecurityBundle\Security;

/** @implements ProviderInterface<Budget> */
final class BudgetStateProvider implements ProviderInterface
{
    /**
     * @param ProviderInterface<Budget> $itemProvider
     * @param ProviderInterface<Budget> $collectionProvider
     */
    public function __construct(
        private readonly TransactionRepository $transactionRepository,
        private readonly ProviderInterface $itemProvider,
        private readonly ProviderInterface $collectionProvider,
        private readonly Security $security,
    ) {}

    /** @return Budget|iterable<Budget>|null */
    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        $isCollection = $operation instanceof CollectionOperationInterface;

        if ($isCollection) {
            $budgets = $this->collectionProvider->provide($operation, $uriVariables, $context);
            if (is_iterable($budgets)) {
                foreach ($budgets as $budget) {
                    $this->attachSpent($budget);
                }
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
        $category = $budget->getCategory();
        if ($category === null) {
            return;
        }
        $categoryId = $category->getId();
        if ($categoryId === null) {
            return;
        }
        $month = $budget->getMonth();
        $year = $budget->getYear();
        /** @var User $user */
        $user = $this->security->getUser();
        $spent = $this->transactionRepository->getSpentForBudget($categoryId, $month, $year, $user);
        $budget->setSpent($spent);
    }
}
