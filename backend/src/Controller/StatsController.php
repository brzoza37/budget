<?php

namespace App\Controller;

use App\Entity\User;
use App\Repository\AccountRepository;
use App\Repository\PlannedItemRepository;
use App\Repository\TransactionRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

class StatsController extends AbstractController
{
    public function __construct(
        private readonly AccountRepository $accountRepository,
        private readonly TransactionRepository $transactionRepository,
        private readonly PlannedItemRepository $plannedItemRepository,
    ) {}

    #[Route("/api/stats/summary", name: "stats_summary", methods: ["GET"])]
    public function summary(Request $request): JsonResponse
    {
        $year  = (int) $request->query->get("year", date("Y"));
        $month = (int) $request->query->get("month", date("n"));

        /** @var User $user */
        $user = $this->getUser();

        $balanceData  = $this->accountRepository->getTotalBalance($user);
        $totalBalance = $balanceData['total'];
        $missingRates = array_values(array_unique($balanceData['missingCurrencies']));

        $monthlyIncome   = $this->transactionRepository->getMonthlyTotal("INCOME", $month, $year, $user);
        $monthlyExpense  = $this->transactionRepository->getMonthlyTotal("EXPENSE", $month, $year, $user);
        $plannedIncome   = $this->plannedItemRepository->getPlannedIncomeForMonth($month, $year, $user);
        $plannedExpenses = $this->plannedItemRepository->getPlannedExpensesForMonth($month, $year, $user);

        return $this->json([
            "totalBalance"             => $totalBalance,
            "monthlyIncome"            => $monthlyIncome,
            "monthlyExpense"           => $monthlyExpense,
            "plannedIncomeThisMonth"   => $plannedIncome,
            "plannedExpensesThisMonth" => $plannedExpenses,
            "forecastedBalance"        => $totalBalance + $plannedIncome - $plannedExpenses,
            "missingRates"             => $missingRates,
        ]);
    }

    #[Route("/api/stats/monthly-trend", name: "stats_monthly_trend", methods: ["GET"])]
    public function monthlyTrend(Request $request): JsonResponse
    {
        $months = min(max((int) $request->query->get("months", 6), 1), 24);

        /** @var User $user */
        $user = $this->getUser();
        $data = [];
        for ($i = $months - 1; $i >= 0; $i--) {
            $date  = new \DateTimeImmutable("first day of -$i months");
            $month = (int) $date->format("n");
            $year  = (int) $date->format("Y");
            $data[] = [
                "month"   => $date->format("Y-m"),
                "income"  => $this->transactionRepository->getMonthlyTotal("INCOME", $month, $year, $user),
                "expense" => $this->transactionRepository->getMonthlyTotal("EXPENSE", $month, $year, $user),
            ];
        }

        return $this->json($data);
    }
}
