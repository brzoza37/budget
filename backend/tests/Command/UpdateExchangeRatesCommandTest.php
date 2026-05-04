<?php

namespace App\Tests\Command;

use App\Command\UpdateExchangeRatesCommand;
use App\Entity\ExchangeRate;
use App\Repository\ExchangeRateRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\NullLogger;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\Console\Tester\CommandTester;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;

class UpdateExchangeRatesCommandTest extends KernelTestCase
{
    private EntityManagerInterface $em;

    protected function setUp(): void
    {
        $kernel = self::bootKernel();
        $this->em = $kernel->getContainer()->get('doctrine.orm.entity_manager');
        $this->em->getConnection()->executeStatement('DELETE FROM exchange_rate');
    }

    private function makeCommand(MockHttpClient $client): CommandTester
    {
        $command = new UpdateExchangeRatesCommand($client, $this->em, new NullLogger());
        return new CommandTester($command);
    }

    /** @return ExchangeRateRepository */
    private function repo(): ExchangeRateRepository
    {
        /** @var ExchangeRateRepository $repo */
        $repo = $this->em->getRepository(ExchangeRate::class);
        return $repo;
    }

    public function testInsertsRatesOnFirstRun(): void
    {
        $body = (string) json_encode(['base' => 'EUR', 'rates' => ['USD' => 1.08, 'PLN' => 4.25]]);
        $tester = $this->makeCommand(new MockHttpClient(new MockResponse($body)));
        $tester->execute([]);
        $tester->assertCommandIsSuccessful();

        $rates = $this->repo()->findAll();
        $this->assertCount(2, $rates);
        $usd = $this->repo()->findOneBy(['targetCurrency' => 'USD']);
        $this->assertNotNull($usd);
        $this->assertEqualsWithDelta(1.08, $usd->getRate(), 0.001);
    }

    public function testUpsertsExistingRate(): void
    {
        $old = (new ExchangeRate())->setTargetCurrency('USD')->setRate(1.05)->setFetchedAt(new \DateTimeImmutable('-1 day'));
        $this->em->persist($old);
        $this->em->flush();

        $body = (string) json_encode(['base' => 'EUR', 'rates' => ['USD' => 1.08]]);
        $tester = $this->makeCommand(new MockHttpClient(new MockResponse($body)));
        $tester->execute([]);
        $tester->assertCommandIsSuccessful();

        $all = $this->repo()->findAll();
        $this->assertCount(1, $all);
        $this->assertEqualsWithDelta(1.08, $all[0]->getRate(), 0.001);
    }

    public function testHandlesHttpFailureGracefully(): void
    {
        $tester = $this->makeCommand(new MockHttpClient(new MockResponse('error', ['http_code' => 500])));
        $tester->execute([]);
        $tester->assertCommandIsSuccessful();
        $this->assertCount(0, $this->repo()->findAll());
    }
}
