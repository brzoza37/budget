<?php

namespace App\Tests\Unit\State;

use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\State\ProviderInterface;
use App\Entity\Budget;
use App\Entity\Category;
use App\Entity\User;
use App\Repository\TransactionRepository;
use App\State\BudgetStateProvider;
use PHPUnit\Framework\TestCase;
use Symfony\Bundle\SecurityBundle\Security;

class BudgetStateProviderTest extends TestCase
{
    private function makeBudgetWithCategory(): Budget
    {
        $category = $this->createStub(Category::class);
        $category->method('getId')->willReturn(42);

        $budget = new Budget();
        $budget->setCategory($category)->setMonth(5)->setYear(2026)->setAmount(500.0);
        return $budget;
    }

    public function testCollectionCallsAttachSpentOnEach(): void
    {
        $budget1 = $this->makeBudgetWithCategory();
        $budget2 = $this->makeBudgetWithCategory();

        $collectionProvider = $this->createStub(ProviderInterface::class);
        $collectionProvider->method('provide')->willReturn([$budget1, $budget2]);

        $transactionRepo = $this->createMock(TransactionRepository::class);
        $transactionRepo->expects($this->exactly(2))->method('getSpentForBudget')->willReturn(100.0);

        $security = $this->createStub(Security::class);
        $security->method('getUser')->willReturn(new User());

        $provider = new BudgetStateProvider(
            $transactionRepo,
            $this->createStub(ProviderInterface::class),
            $collectionProvider,
            $security,
        );
        $provider->provide(new GetCollection(), [], []);

        $this->assertSame(100.0, $budget1->getSpent());
        $this->assertSame(100.0, $budget2->getSpent());
    }

    public function testItemCallsAttachSpent(): void
    {
        $budget = $this->makeBudgetWithCategory();

        $itemProvider = $this->createStub(ProviderInterface::class);
        $itemProvider->method('provide')->willReturn($budget);

        $transactionRepo = $this->createMock(TransactionRepository::class);
        $transactionRepo->expects($this->once())->method('getSpentForBudget')->willReturn(150.0);

        $security = $this->createStub(Security::class);
        $security->method('getUser')->willReturn(new User());

        $provider = new BudgetStateProvider(
            $transactionRepo,
            $itemProvider,
            $this->createStub(ProviderInterface::class),
            $security,
        );
        $provider->provide(new Get(), [], []);

        $this->assertSame(150.0, $budget->getSpent());
    }

    public function testNullCategorySkipsSpent(): void
    {
        $budget = new Budget();
        $budget->setMonth(5)->setYear(2026)->setAmount(500.0);

        $itemProvider = $this->createStub(ProviderInterface::class);
        $itemProvider->method('provide')->willReturn($budget);

        $transactionRepo = $this->createMock(TransactionRepository::class);
        $transactionRepo->expects($this->never())->method('getSpentForBudget');

        $security = $this->createStub(Security::class);
        $security->method('getUser')->willReturn(new User());

        $provider = new BudgetStateProvider(
            $transactionRepo,
            $itemProvider,
            $this->createStub(ProviderInterface::class),
            $security,
        );
        $provider->provide(new Get(), [], []);
    }
}
