<?php

namespace App\Command;

use App\Entity\ExchangeRate;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

#[AsCommand(name: 'app:exchange-rates:update', description: 'Fetch latest EUR-based exchange rates from frankfurter.app')]
class UpdateExchangeRatesCommand extends Command
{
    private const API_URL = 'https://api.frankfurter.app/latest';

    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly EntityManagerInterface $em,
        private readonly LoggerInterface $logger,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        try {
            $data = $this->httpClient->request('GET', self::API_URL)->toArray();
        } catch (\Throwable $e) {
            $this->logger->warning('Failed to fetch exchange rates: ' . $e->getMessage());
            return Command::SUCCESS;
        }

        /** @var array<string, float> $rates */
        $rates = isset($data['rates']) && is_array($data['rates']) ? $data['rates'] : [];
        /** @var \App\Repository\ExchangeRateRepository $repo */
        $repo  = $this->em->getRepository(ExchangeRate::class);

        foreach ($rates as $currency => $rate) {
            $entity = $repo->findOneBy(['targetCurrency' => $currency]) ?? (new ExchangeRate())->setTargetCurrency($currency);
            $entity->setRate((float) $rate)->setFetchedAt(new \DateTimeImmutable());
            $this->em->persist($entity);
        }

        $this->em->flush();
        $output->writeln(sprintf('Updated %d exchange rates.', count($rates)));

        return Command::SUCCESS;
    }
}
