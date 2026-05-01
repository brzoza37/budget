<?php

namespace App\Tests\Controller;

use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class SecurityTest extends WebTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        static::ensureKernelShutdown();
        $kernel = static::bootKernel();
        /** @var EntityManagerInterface $em */
        $em = $kernel->getContainer()->get('doctrine.orm.entity_manager');
        $em->getConnection()->executeStatement('DELETE FROM "user"');
        static::ensureKernelShutdown();
    }

    public function testUnauthenticatedRequestReturns401(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/accounts');
        $this->assertResponseStatusCodeSame(401);
    }

    public function testAuthenticatedRequestSucceeds(): void
    {
        $client = static::createClient();
        $client->request('POST', '/api/auth/register', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode([
            'email' => 'scope@example.com',
            'password' => 'Secret123!@#',
            'displayName' => 'Scope User',
        ]));
        $token = json_decode($client->getResponse()->getContent(), true)['token'];
        $client->request('GET', '/api/accounts', [], [], [
            'HTTP_AUTHORIZATION' => "Bearer $token",
            'HTTP_ACCEPT' => 'application/ld+json',
        ]);
        $this->assertResponseIsSuccessful();
    }
}
