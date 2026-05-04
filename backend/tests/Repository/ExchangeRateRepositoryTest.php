<?php

namespace App\Tests\Repository;

use App\Entity\ExchangeRate;
use App\Repository\ExchangeRateRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class ExchangeRateRepositoryTest extends KernelTestCase
{
    private EntityManagerInterface $em;
    private ExchangeRateRepository $repo;

    protected function setUp(): void
    {
        $kernel = self::bootKernel();
        $this->em = $kernel->getContainer()->get('doctrine.orm.entity_manager');
        /** @var ExchangeRateRepository $repo */
        $repo = $this->em->getRepository(ExchangeRate::class);
        $this->repo = $repo;
        $this->em->getConnection()->executeStatement('DELETE FROM exchange_rate');

        foreach ([['USD', 1.08], ['PLN', 4.25], ['GBP', 0.86]] as [$cur, $rate]) {
            $er = (new ExchangeRate())->setTargetCurrency($cur)->setRate($rate)->setFetchedAt(new \DateTimeImmutable());
            $this->em->persist($er);
        }
        $this->em->flush();
    }

    public function testSameCurrencyReturnsAmount(): void
    {
        $this->assertSame(100.0, $this->repo->convert(100.0, 'PLN', 'PLN'));
    }

    public function testEurToTarget(): void
    {
        $this->assertEqualsWithDelta(425.0, $this->repo->convert(100.0, 'EUR', 'PLN'), 0.001);
    }

    public function testTargetToEur(): void
    {
        $this->assertEqualsWithDelta(100.0, $this->repo->convert(108.0, 'USD', 'EUR'), 0.001);
    }

    public function testCrossRate(): void
    {
        // USD→PLN: 100 * (4.25 / 1.08)
        $expected = 100.0 * (4.25 / 1.08);
        $this->assertEqualsWithDelta($expected, $this->repo->convert(100.0, 'USD', 'PLN'), 0.001);
    }

    public function testMissingRateReturnsNull(): void
    {
        $this->assertNull($this->repo->convert(100.0, 'JPY', 'PLN'));
    }
}
