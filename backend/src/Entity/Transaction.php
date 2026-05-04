<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use App\Entity\PlannedItem;
use App\Entity\User;
use App\Repository\TransactionRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[Assert\Expression(
    "(this.getOriginalCurrency() === null) === (this.getOriginalAmount() === null)",
    message: "originalCurrency and originalAmount must both be set or both be null"
)]
#[ORM\Entity(repositoryClass: TransactionRepository::class)]
#[ApiResource(
    security: "is_granted('ROLE_USER')",
    operations: [
        new \ApiPlatform\Metadata\Get(),
        new \ApiPlatform\Metadata\GetCollection(),
        new \ApiPlatform\Metadata\Post(),
        new \ApiPlatform\Metadata\Put(),
        new \ApiPlatform\Metadata\Patch(),
        new \ApiPlatform\Metadata\Delete(),
    ],
    normalizationContext: ['groups' => ['transaction:read'], 'enable_max_depth' => true],
    denormalizationContext: ['groups' => ['transaction:write']],
    paginationClientItemsPerPage: true,
    paginationMaximumItemsPerPage: 1000,
)]
class Transaction
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['transaction:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 50)]
    #[Groups(['transaction:read', 'transaction:write'])]
    private string $type = ''; // INCOME, EXPENSE, TRANSFER

    #[ORM\Column]
    #[Groups(['transaction:read', 'transaction:write'])]
    private float $amount = 0.0;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['transaction:read', 'transaction:write', 'account:read'])]
    // @phpstan-ignore doctrine.associationType (always set before persist via SetUserListener or explicit setter)
    private ?Account $account = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true)]
    #[Groups(['transaction:read', 'transaction:write', 'category:read'])]
    private ?Category $category = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true)]
    #[Groups(['transaction:read', 'transaction:write', 'account:read'])]
    private ?Account $toAccount = null; // for transfers

    #[ORM\Column(type: 'text', nullable: true)]
    #[Groups(['transaction:read', 'transaction:write'])]
    private ?string $note = null;

    #[ORM\Column(length: 3, nullable: true)]
    #[Groups(['transaction:read', 'transaction:write'])]
    private ?string $originalCurrency = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['transaction:read', 'transaction:write'])]
    private ?float $originalAmount = null;

    #[ORM\Column]
    #[Groups(['transaction:read', 'transaction:write'])]
    // @phpstan-ignore doctrine.columnType (set in constructor before persist)
    private ?\DateTimeImmutable $date = null;

    #[ORM\Column]
    #[Groups(['transaction:read'])]
    // @phpstan-ignore doctrine.columnType (set by lifecycle callback before persist)
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column]
    #[Groups(['transaction:read'])]
    // @phpstan-ignore doctrine.columnType (set by lifecycle callback before persist)
    private ?\DateTimeImmutable $updatedAt = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    #[Groups(['transaction:read'])]
    private ?PlannedItem $plannedItem = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    // @phpstan-ignore doctrine.associationType (always set before persist via SetUserListener or explicit setter)
    private ?User $user = null;

    public function getUser(): ?User { return $this->user; }
    public function setUser(?User $user): static { $this->user = $user; return $this; }

    public function __construct()
    {
        $this->date = new \DateTimeImmutable();
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getType(): string
    {
        return $this->type;
    }

    public function setType(string $type): static
    {
        $this->type = $type;
        return $this;
    }

    public function getAmount(): float
    {
        return $this->amount;
    }

    public function setAmount(float $amount): static
    {
        $this->amount = $amount;
        return $this;
    }

    public function getAccount(): ?Account
    {
        return $this->account;
    }

    public function setAccount(?Account $account): static
    {
        $this->account = $account;
        return $this;
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

    public function getToAccount(): ?Account
    {
        return $this->toAccount;
    }

    public function setToAccount(?Account $toAccount): static
    {
        $this->toAccount = $toAccount;
        return $this;
    }

    public function getNote(): ?string
    {
        return $this->note;
    }

    public function setNote(?string $note): static
    {
        $this->note = $note;
        return $this;
    }

    public function getOriginalCurrency(): ?string { return $this->originalCurrency; }
    public function setOriginalCurrency(?string $v): static { $this->originalCurrency = $v; return $this; }

    public function getOriginalAmount(): ?float { return $this->originalAmount; }
    public function setOriginalAmount(?float $v): static { $this->originalAmount = $v; return $this; }

    public function getDate(): ?\DateTimeImmutable
    {
        return $this->date;
    }

    public function setDate(\DateTimeImmutable $date): static
    {
        $this->date = $date;
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

    public function getPlannedItem(): ?PlannedItem { return $this->plannedItem; }
    public function setPlannedItem(?PlannedItem $plannedItem): static { $this->plannedItem = $plannedItem; return $this; }
}
