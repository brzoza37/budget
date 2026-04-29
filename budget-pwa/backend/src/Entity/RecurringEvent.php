<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Put;
use ApiPlatform\Metadata\Patch;
use App\Repository\RecurringEventRepository;
use App\State\RecurringEventDeleteProcessor;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;

#[ORM\Entity(repositoryClass: RecurringEventRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ApiResource(
    operations: [
        new Get(),
        new GetCollection(),
        new Post(),
        new Put(),
        new Patch(),
        new Delete(processor: RecurringEventDeleteProcessor::class),
    ],
    normalizationContext: ['groups' => ['recurring:read'], 'enable_max_depth' => true],
    denormalizationContext: ['groups' => ['recurring:write']],
)]
class RecurringEvent
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['recurring:read', 'plan:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Groups(['recurring:read', 'recurring:write', 'plan:read'])]
    private ?string $name = null;

    #[ORM\Column]
    #[Groups(['recurring:read', 'recurring:write'])]
    private ?float $amount = null;

    #[ORM\Column(length: 10)]
    #[Groups(['recurring:read', 'recurring:write'])]
    private ?string $type = null; // INCOME or EXPENSE

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true)]
    #[Groups(['recurring:read', 'recurring:write'])]
    private ?Category $category = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true)]
    #[Groups(['recurring:read', 'recurring:write'])]
    private ?Account $account = null;

    #[ORM\Column]
    #[Groups(['recurring:read', 'recurring:write'])]
    private ?int $repeatEvery = 1;

    #[ORM\Column(length: 10)]
    #[Groups(['recurring:read', 'recurring:write'])]
    private ?string $repeatUnit = 'months'; // days, weeks, months, years

    #[ORM\Column(nullable: true)]
    #[Groups(['recurring:read', 'recurring:write'])]
    private ?int $dayOfMonth = null;

    #[ORM\Column]
    #[Groups(['recurring:read', 'recurring:write'])]
    private ?\DateTimeImmutable $startDate = null;

    #[ORM\Column(type: 'text', nullable: true)]
    #[Groups(['recurring:read', 'recurring:write'])]
    private ?string $note = null;

    #[ORM\Column]
    #[Groups(['recurring:read'])]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column]
    #[Groups(['recurring:read'])]
    private ?\DateTimeImmutable $updatedAt = null;

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

    public function getRepeatEvery(): ?int { return $this->repeatEvery; }
    public function setRepeatEvery(int $repeatEvery): static { $this->repeatEvery = $repeatEvery; return $this; }

    public function getRepeatUnit(): ?string { return $this->repeatUnit; }
    public function setRepeatUnit(string $repeatUnit): static { $this->repeatUnit = $repeatUnit; return $this; }

    public function getDayOfMonth(): ?int { return $this->dayOfMonth; }
    public function setDayOfMonth(?int $dayOfMonth): static { $this->dayOfMonth = $dayOfMonth; return $this; }

    public function getStartDate(): ?\DateTimeImmutable { return $this->startDate; }
    public function setStartDate(\DateTimeImmutable $startDate): static { $this->startDate = $startDate; return $this; }

    public function getNote(): ?string { return $this->note; }
    public function setNote(?string $note): static { $this->note = $note; return $this; }

    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): ?\DateTimeImmutable { return $this->updatedAt; }

    #[ORM\PreUpdate]
    public function updateTimestamp(): void { $this->updatedAt = new \DateTimeImmutable(); }
}
