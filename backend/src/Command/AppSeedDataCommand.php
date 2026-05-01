<?php

namespace App\Command;

use App\Entity\Account;
use App\Entity\Category;
use App\Entity\Transaction;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:seed-data',
    description: 'Seeds initial data for the Budget application',
)]
class AppSeedDataCommand extends Command
{
    private EntityManagerInterface $entityManager;

    public function __construct(EntityManagerInterface $entityManager)
    {
        $this->entityManager = $entityManager;
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $io->info('Seeding Accounts...');
        $mainAccount = (new Account())
            ->setName('Main Bank Account')
            ->setType('CHECKING')
            ->setBalance(2500.50)
            ->setCurrency('USD')
            ->setColor('#2196F3')
            ->setIcon('account_balance');

        $savingsAccount = (new Account())
            ->setName('Savings')
            ->setType('SAVINGS')
            ->setBalance(10000.00)
            ->setCurrency('USD')
            ->setColor('#4CAF50')
            ->setIcon('savings');

        $this->entityManager->persist($mainAccount);
        $this->entityManager->persist($savingsAccount);

        $io->info('Seeding Categories...');
        $foodCategory = (new Category())
            ->setName('Food & Dining')
            ->setType('EXPENSE')
            ->setColor('#F44336')
            ->setIcon('restaurant');

        $rentCategory = (new Category())
            ->setName('Rent & Utilities')
            ->setType('EXPENSE')
            ->setColor('#9C27B0')
            ->setIcon('home');

        $salaryCategory = (new Category())
            ->setName('Salary')
            ->setType('INCOME')
            ->setColor('#4CAF50')
            ->setIcon('payments');

        $this->entityManager->persist($foodCategory);
        $this->entityManager->persist($rentCategory);
        $this->entityManager->persist($salaryCategory);

        $io->info('Seeding initial Transactions...');
        $transaction = (new Transaction())
            ->setNote('Weekly Groceries')
            ->setAmount(85.20)
            ->setType('EXPENSE')
            ->setDate(new \DateTimeImmutable())
            ->setAccount($mainAccount)
            ->setCategory($foodCategory);

        $this->entityManager->persist($transaction);

        $this->entityManager->flush();

        $io->success('Data seeded successfully!');

        return Command::SUCCESS;
    }
}
