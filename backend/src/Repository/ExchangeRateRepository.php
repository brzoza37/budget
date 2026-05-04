<?php

namespace App\Repository;

use App\Entity\ExchangeRate;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<ExchangeRate> */
class ExchangeRateRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ExchangeRate::class);
    }

    public function convert(float $amount, string $from, string $to): ?float
    {
        if ($from === $to) {
            return $amount;
        }

        if ($from === 'EUR') {
            /** @var ExchangeRate|null $rate */
            $rate = $this->findOneBy(['targetCurrency' => $to]);
            if ($rate === null) return null;
            return $amount * $rate->getRate();
        }

        if ($to === 'EUR') {
            /** @var ExchangeRate|null $rate */
            $rate = $this->findOneBy(['targetCurrency' => $from]);
            if ($rate === null) return null;
            return $amount / $rate->getRate();
        }

        /** @var ExchangeRate|null $fromRate */
        $fromRate = $this->findOneBy(['targetCurrency' => $from]);
        /** @var ExchangeRate|null $toRate */
        $toRate   = $this->findOneBy(['targetCurrency' => $to]);
        if ($fromRate === null || $toRate === null) return null;

        return $amount * ($toRate->getRate() / $fromRate->getRate());
    }
}
