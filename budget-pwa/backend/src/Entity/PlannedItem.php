<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Put;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Doctrine\Orm\Filter\DateFilter;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use App\Entity\User;
use App\Repository\PlannedItemRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;

#[ORM\Entity(repositoryClass: PlannedItemRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ApiResource(
    security: "is_granted('ROLE_USER')",
    operations: [
        new Get(),
        new GetCollection(),
        new Post(),
        new Put(),
        new Patch(),
        new Delete(),
    ],
    normalizationContext: ['groups' => ['plan:read'], 'enable_max_depth' => true],
    denormalizationContext: ['groups' => ['plan:write']],
)]
#[ApiFilter(DateFilter::class, properties: ['dueDate'])]
#[ApiFilter(SearchFilter::class, properties: ['type' => 'exact', 'isPaid' => 'exact'])]
class PlannedItem
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['plan:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Groups(['plan:read', 'plan:write'])]
    private ?string $name = null;

    #[ORM\Column]
    #[Groups(['plan:read', 'plan:write'])]
    private ?float $amount = null;

    #[ORM\Column(length: 10)]
    #[Groups(['plan:read', 'plan:write'])]
    private ?string $type = null; // INCOME or EXPENSE

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true)]
    #[Groups(['plan:read', 'plan:write'])]
    private ?Category $category = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true)]
    #[Groups(['plan:read', 'plan:write'])]
    private ?Account $account = null;

    #[ORM\Column]
    #[Groups(['plan:read', 'plan:write'])]
    private ?\DateTimeImmutable $dueDate = null;

    #[ORM\Column]
    #[Groups(['plan:read', 'plan:write'])]
    private bool $isPaid = false;

    #[ORM\Column(nullable: true)]
    #[Groups(['plan:read', 'plan:write'])]
    private ?float $paidAmount = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['plan:read'])]
    private ?\DateTimeImmutable $paidAt = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    #[Groups(['plan:read'])]
    private ?Transaction $paidTransaction = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    #[Groups(['plan:read', 'plan:write'])]
    private ?RecurringEvent $recurringEvent = null;

    #[ORM\Column(type: 'text', nullable: true)]
    #[Groups(['plan:read', 'plan:write'])]
    private ?string $note = null;

    #[ORM\Column]
    #[Groups(['plan:read'])]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column]
    #[Groups(['plan:read'])]
    private ?\DateTimeImmutable $updatedAt = null;

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

    public function getId(): ?int { return $this->id; }

    public function getName(): ?string { return $this->name; }
    public function setName(string $name): static { $this->name = $name; return $this; }

    public function getAmount(): ?float { return $this->amount; }
    public function setAmount(float $amount): static { $this->amount = $amount; return $this; }

    public function getType(): ?string { return $this->type; }
    public function setType(string $type): static { $this->type = $type; return $this; }

    public function getCategory(): ?Category { return $this->category; }
    public function setCategory(?Category $category): static { $this->category = $category; return $this; }

    public function getAccount(): ?Account { return $this->account; }
    public function setAccount(?Account $account): static { $this->account = $account; return $this; }

    public function getDueDate(): ?\DateTimeImmutable { return $this->dueDate; }
    public function setDueDate(\DateTimeImmutable $dueDate): static { $this->dueDate = $dueDate; return $this; }

    public function isPaid(): bool { return $this->isPaid; }
    public function setIsPaid(bool $isPaid): static { $this->isPaid = $isPaid; return $this; }

    public function getPaidAmount(): ?float { return $this->paidAmount; }
    public function setPaidAmount(?float $paidAmount): static { $this->paidAmount = $paidAmount; return $this; }

    public function getPaidAt(): ?\DateTimeImmutable { return $this->paidAt; }
    public function setPaidAt(?\DateTimeImmutable $paidAt): static { $this->paidAt = $paidAt; return $this; }

    public function getPaidTransaction(): ?Transaction { return $this->paidTransaction; }
    public function setPaidTransaction(?Transaction $paidTransaction): static { $this->paidTransaction = $paidTransaction; return $this; }

    public function getRecurringEvent(): ?RecurringEvent { return $this->recurringEvent; }
    public function setRecurringEvent(?RecurringEvent $recurringEvent): static { $this->recurringEvent = $recurringEvent; return $this; }

    public function getNote(): ?string { return $this->note; }
    public function setNote(?string $note): static { $this->note = $note; return $this; }

    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): ?\DateTimeImmutable { return $this->updatedAt; }

    #[ORM\PreUpdate]
    public function updateTimestamp(): void { $this->updatedAt = new \DateTimeImmutable(); }
}
