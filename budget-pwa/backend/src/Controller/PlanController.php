<?php

namespace App\Controller;

use App\Entity\PlannedItem;
use App\Entity\Transaction;
use App\Repository\AccountRepository;
use App\Repository\PlannedItemRepository;
use App\Repository\RecurringEventRepository;
use App\Service\RecurringEventGeneratorService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class PlanController extends AbstractController
{
    public function __construct(
        private readonly PlannedItemRepository $plannedItemRepository,
        private readonly RecurringEventRepository $recurringEventRepository,
        private readonly AccountRepository $accountRepository,
        private readonly RecurringEventGeneratorService $generator,
        private readonly EntityManagerInterface $em,
    ) {}

    #[Route('/api/plan/confirm/{id}', name: 'plan_confirm', methods: ['POST'])]
    public function confirm(int $id, Request $request): JsonResponse
    {
        $item = $this->plannedItemRepository->find($id);
        if (!$item) {
            return $this->json(['error' => 'PlannedItem not found'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);
        $amount = (float) ($data['amount'] ?? $item->getAmount());
        $accountId = (int) ($data['accountId'] ?? 0);
        $date = isset($data['date'])
            ? new \DateTimeImmutable($data['date'])
            : new \DateTimeImmutable();

        $account = $this->accountRepository->find($accountId);
        if (!$account) {
            return $this->json(['error' => 'Account not found'], Response::HTTP_BAD_REQUEST);
        }

        // Create the real transaction
        $transaction = new Transaction();
        $transaction->setType($item->getType()); // INCOME or EXPENSE
        $transaction->setAmount($amount);
        $transaction->setAccount($account);
        $transaction->setCategory($item->getCategory());
        $transaction->setDate($date);
        $transaction->setNote($item->getName());
        $transaction->setPlannedItem($item);
        $this->em->persist($transaction);

        // Update account balance
        if ($item->getType() === 'EXPENSE') {
            $account->setBalance($account->getBalance() - $amount);
        } else {
            $account->setBalance($account->getBalance() + $amount);
        }

        // Update the planned item
        $accumulated = ($item->getPaidAmount() ?? 0) + $amount;
        $item->setPaidAmount($accumulated);
        $item->setPaidAt($date);
        $item->setPaidTransaction($transaction);
        if ($accumulated >= $item->getAmount()) {
            $item->setIsPaid(true);
        }

        $this->em->flush();

        return $this->json([
            'id' => $item->getId(),
            'isPaid' => $item->isPaid(),
            'paidAmount' => $item->getPaidAmount(),
            'paidAt' => $item->getPaidAt()?->format(\DateTimeInterface::ATOM),
            'transactionId' => $transaction->getId(),
        ]);
    }

    #[Route('/api/plan/generate_month', name: 'plan_generate_month', methods: ['POST'])]
    public function generateMonth(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $month = (int) ($data['month'] ?? date('n'));
        $year = (int) ($data['year'] ?? date('Y'));

        if ($month < 1 || $month > 12) {
            return $this->json(['error' => 'Invalid month'], Response::HTTP_BAD_REQUEST);
        }

        $events = $this->recurringEventRepository->findAllActive();
        $generated = $this->generator->generateForMonth($events, $month, $year);

        return $this->json(['generated' => $generated]);
    }
}
