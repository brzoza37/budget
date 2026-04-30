<?php

namespace App\Tests\Controller;

use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class AuthControllerTest extends WebTestCase
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

    private function jsonPost(object $client, string $url, array $data): void
    {
        $client->request(
            'POST', $url, [], [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode($data)
        );
    }

    public function testRegisterReturnsTokenAndUser(): void
    {
        $client = static::createClient();
        $this->jsonPost($client, '/api/auth/register', [
            'email' => 'test@example.com',
            'password' => 'secret123',
            'displayName' => 'Test User',
        ]);
        $this->assertResponseStatusCodeSame(201);
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('token', $data);
        $this->assertArrayHasKey('user', $data);
        $this->assertEquals('test@example.com', $data['user']['email']);
        $this->assertEquals('Test User', $data['user']['displayName']);
        $this->assertEquals('USD', $data['user']['currency']);
    }

    public function testRegisterRejectsDuplicateEmail(): void
    {
        $client = static::createClient();
        $payload = ['email' => 'dup@example.com', 'password' => 'secret123', 'displayName' => 'Dup'];
        $this->jsonPost($client, '/api/auth/register', $payload);
        $this->assertResponseStatusCodeSame(201);
        $this->jsonPost($client, '/api/auth/register', $payload);
        $this->assertResponseStatusCodeSame(409);
    }

    public function testRegisterValidatesEmail(): void
    {
        $client = static::createClient();
        $this->jsonPost($client, '/api/auth/register', [
            'email' => 'not-an-email',
            'password' => 'secret123',
            'displayName' => 'Bad',
        ]);
        $this->assertResponseStatusCodeSame(400);
    }

    public function testRegisterValidatesPasswordLength(): void
    {
        $client = static::createClient();
        $this->jsonPost($client, '/api/auth/register', [
            'email' => 'short@example.com',
            'password' => 'short',
            'displayName' => 'Short',
        ]);
        $this->assertResponseStatusCodeSame(400);
    }

    public function testLoginReturnsToken(): void
    {
        $client = static::createClient();
        $this->jsonPost($client, '/api/auth/register', [
            'email' => 'login@example.com',
            'password' => 'secret123',
            'displayName' => 'Login User',
        ]);
        $this->jsonPost($client, '/api/auth/login', [
            'email' => 'login@example.com',
            'password' => 'secret123',
        ]);
        $this->assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('token', $data);
        $this->assertArrayHasKey('user', $data);
    }

    public function testLoginRejectsWrongPassword(): void
    {
        $client = static::createClient();
        $this->jsonPost($client, '/api/auth/register', [
            'email' => 'wrong@example.com',
            'password' => 'secret123',
            'displayName' => 'Wrong',
        ]);
        $this->jsonPost($client, '/api/auth/login', [
            'email' => 'wrong@example.com',
            'password' => 'badpassword',
        ]);
        $this->assertResponseStatusCodeSame(401);
    }

    public function testMeRequiresAuth(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/auth/me');
        $this->assertResponseStatusCodeSame(401);
    }

    public function testMeReturnsCurrentUser(): void
    {
        $client = static::createClient();
        $this->jsonPost($client, '/api/auth/register', [
            'email' => 'me@example.com',
            'password' => 'secret123',
            'displayName' => 'Me User',
        ]);
        $token = json_decode($client->getResponse()->getContent(), true)['token'];
        $client->request('GET', '/api/auth/me', [], [], [
            'HTTP_AUTHORIZATION' => "Bearer $token",
        ]);
        $this->assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertEquals('me@example.com', $data['email']);
        $this->assertEquals('Me User', $data['displayName']);
    }
}
