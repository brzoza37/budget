<?php

namespace App\Repository;

use App\Entity\ExchangeRate;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

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
            $rate = $this->findOneBy(['targetCurrency' => $to]);
            if ($rate === null) return null;
            return $amount * $rate->getRate();
        }

        if ($to === 'EUR') {
            $rate = $this->findOneBy(['targetCurrency' => $from]);
            if ($rate === null) return null;
            return $amount / $rate->getRate();
        }

        $fromRate = $this->findOneBy(['targetCurrency' => $from]);
        $toRate   = $this->findOneBy(['targetCurrency' => $to]);
        if ($fromRate === null || $toRate === null) return null;

        return $amount * ($toRate->getRate() / $fromRate->getRate());
    }
}
