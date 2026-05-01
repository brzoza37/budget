<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use App\Entity\User;
use App\Repository\BudgetRepository;
use App\State\BudgetStateProvider;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;

#[ORM\Entity(repositoryClass: BudgetRepository::class)]
#[ApiResource(
    security: "is_granted('ROLE_USER')",
    operations: [
        new \ApiPlatform\Metadata\Get(provider: BudgetStateProvider::class),
        new \ApiPlatform\Metadata\GetCollection(provider: BudgetStateProvider::class),
        new \ApiPlatform\Metadata\Post(),
        new \ApiPlatform\Metadata\Put(),
        new \ApiPlatform\Metadata\Patch(),
        new \ApiPlatform\Metadata\Delete(),
    ],
    normalizationContext: ['groups' => ['budget:read'], 'enable_max_depth' => true],
    denormalizationContext: ['groups' => ['budget:write']],
)]
class Budget
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['budget:read'])]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['budget:read', 'budget:write'])]
    private ?Category $category = null;

    #[ORM\Column]
    #[Groups(['budget:read', 'budget:write'])]
    private ?float $amount = null;

    #[ORM\Column]
    #[Groups(['budget:read', 'budget:write'])]
    private ?int $month = null;

    #[ORM\Column]
    #[Groups(['budget:read', 'budget:write'])]
    private ?int $year = null;

    #[ORM\Column]
    #[Groups(['budget:read'])]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column]
    #[Groups(['budget:read'])]
    private ?\DateTimeImmutable $updatedAt = null;

    #[Groups(['budget:read'])]
    private float $spent = 0.0;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    public function getUser(): ?User { return $this->user; }
    public function setUser(?User $user): static { $this->user = $user; return $this; }

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getCategory(): ?Category
    {
        return $this->category;
    }

    public function setCategory(?Category $category): static
    {
        $this->category = $category;
        return $this;
    }

    public function getAmount(): ?float
    {
        return $this->amount;
    }

    public function setAmount(float $amount): static
    {
        $this->amount = $amount;
        return $this;
    }

    public function getMonth(): ?int
    {
        return $this->month;
    }

    public function setMonth(int $month): static
    {
        $this->month = $month;
        return $this;
    }

    public function getYear(): ?int
    {
        return $this->year;
    }

    public function setYear(int $year): static
    {
        $this->year = $year;
        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): ?\DateTimeImmutable
    {
        return $this->updatedAt;
    }

    #[ORM\PreUpdate]
    public function updateTimestamp(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getSpent(): float
    {
        return $this->spent;
    }

    public function setSpent(float $spent): static
    {
        $this->spent = $spent;
        return $this;
    }
}
