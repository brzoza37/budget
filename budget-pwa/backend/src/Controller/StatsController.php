<?php

namespace App\Controller;

use App\Repository\AccountRepository;
use App\Repository\PlannedPaymentRepository;
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
        private readonly PlannedPaymentRepository $plannedPaymentRepository,
    ) {}

    #[Route("/api/stats/summary", name: "stats_summary", methods: ["GET"])]
    public function summary(Request $request): JsonResponse
    {
        $year = (int) $request->query->get("year", date("Y"));
        $month = (int) $request->query->get("month", date("n"));

        $totalBalance = $this->accountRepository->getTotalBalance();
        $monthlyIncome = $this->transactionRepository->getMonthlyTotal("INCOME", $month, $year);
        $monthlyExpense = $this->transactionRepository->getMonthlyTotal("EXPENSE", $month, $year);
        $plannedExpensesUnpaid = $this->plannedPaymentRepository->getUnpaidExpensesTotal();
        $forecastedBalance = $totalBalance - $plannedExpensesUnpaid;

        return $this->json([
            "totalBalance" => $totalBalance,
            "monthlyIncome" => $monthlyIncome,
            "monthlyExpense" => $monthlyExpense,
            "plannedExpensesUnpaid" => $plannedExpensesUnpaid,
            "forecastedBalance" => $forecastedBalance,
        ]);
    }

    #[Route("/api/stats/monthly-trend", name: "stats_monthly_trend", methods: ["GET"])]
    public function monthlyTrend(Request $request): JsonResponse
    {
        $months = (int) $request->query->get("months", 6);
        $months = min(max($months, 1), 24);

        $data = [];
        for ($i = $months - 1; $i >= 0; $i--) {
            $date = new \DateTimeImmutable("first day of -$i months");
            $month = (int) $date->format("n");
            $year = (int) $date->format("Y");

            $data[] = [
                "month" => $date->format("Y-m"),
                "income" => $this->transactionRepository->getMonthlyTotal("INCOME", $month, $year),
                "expense" => $this->transactionRepository->getMonthlyTotal("EXPENSE", $month, $year),
            ];
        }

        return $this->json($data);
    }
}
