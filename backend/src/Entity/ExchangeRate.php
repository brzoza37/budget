<?php

namespace App\Entity;

use App\Repository\ExchangeRateRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ExchangeRateRepository::class)]
class ExchangeRate
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 3, unique: true)]
    private string $targetCurrency;

    #[ORM\Column]
    private float $rate;

    #[ORM\Column]
    private \DateTimeImmutable $fetchedAt;

    public function getId(): ?int { return $this->id; }

    public function getTargetCurrency(): string { return $this->targetCurrency; }
    public function setTargetCurrency(string $v): static { $this->targetCurrency = $v; return $this; }

    public function getRate(): float { return $this->rate; }
    public function setRate(float $v): static { $this->rate = $v; return $this; }

    public function getFetchedAt(): \DateTimeImmutable { return $this->fetchedAt; }
    public function setFetchedAt(\DateTimeImmutable $v): static { $this->fetchedAt = $v; return $this; }
}
