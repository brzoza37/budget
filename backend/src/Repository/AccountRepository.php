<?php

namespace App\Repository;

use App\Entity\Account;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Account>
 *
 * @method Account|null find($id, $lockMode = null, $lockVersion = null)
 * @method Account|null findOneBy(array<string, mixed> $criteria, array<string, string>|null $orderBy = null)
 * @method Account[]    findAll()
 * @method Account[]    findBy(array<string, mixed> $criteria, array<string, string>|null $orderBy = null, $limit = null, $offset = null)
 */
class AccountRepository extends ServiceEntityRepository
{
    public function __construct(
        ManagerRegistry $registry,
        private readonly ExchangeRateRepository $exchangeRateRepository,
    ) {
        parent::__construct($registry, Account::class);
    }

    /**
     * @return array{total: float, missingCurrencies: string[]}
     */
    public function getTotalBalance(User $user): array
    {
        /** @var array<int, array{balance: string|float, currency: string}> $rows */
        $rows = $this->createQueryBuilder('a')
            ->select('a.balance', 'a.currency')
            ->where('a.isArchived = false')
            ->andWhere('a.user = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->getArrayResult();

        $userCurrency = $user->getCurrency();
        $total = 0.0;
        /** @var string[] $missingCurrencies */
        $missingCurrencies = [];

        foreach ($rows as $row) {
            $converted = $this->exchangeRateRepository->convert(
                (float) $row['balance'],
                (string) $row['currency'],
                $userCurrency
            );
            if ($converted === null) {
                $missingCurrencies[] = (string) $row['currency'];
            } else {
                $total += $converted;
            }
        }

        return ['total' => $total, 'missingCurrencies' => $missingCurrencies];
    }
}
