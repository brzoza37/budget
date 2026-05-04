<?php

namespace App\Tests\Controller;

use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class AuthControllerTest extends WebTestCase
{
    private const VALID_PASSWORD = 'Secret123!@#';

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

    /** @param array<string, mixed> $data */
    private function jsonPost(KernelBrowser $client, string $url, array $data): void
    {
        $client->request(
            'POST', $url, [], [],
            ['CONTENT_TYPE' => 'application/json'],
            (string) json_encode($data)
        );
    }

    /** @return array<string, mixed> */
    private function jsonDecode(string|false $content): array
    {
        /** @var array<string, mixed> */
        return json_decode((string) $content, true) ?? [];
    }

    private function getTokenFromResponse(KernelBrowser $client): string
    {
        /** @var array{token: string} $data */
        $data = $this->jsonDecode($client->getResponse()->getContent());
        return $data['token'];
    }

    public function testRegisterReturnsTokenAndUser(): void
    {
        $client = static::createClient();
        $this->jsonPost($client, '/api/auth/register', [
            'email' => 'test@example.com',
            'password' => self::VALID_PASSWORD,
            'displayName' => 'Test User',
        ]);
        $this->assertResponseStatusCodeSame(201);
        /** @var array{token: string, user: array{email: string, displayName: string, currency: string}} $data */
        $data = $this->jsonDecode($client->getResponse()->getContent());
        $this->assertArrayHasKey('token', $data);
        $this->assertArrayHasKey('user', $data);
        $this->assertEquals('test@example.com', $data['user']['email']);
        $this->assertEquals('Test User', $data['user']['displayName']);
        $this->assertEquals('USD', $data['user']['currency']);
    }

    public function testRegisterRejectsDuplicateEmail(): void
    {
        $client = static::createClient();
        $payload = ['email' => 'dup@example.com', 'password' => self::VALID_PASSWORD, 'displayName' => 'Dup'];
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
            'password' => self::VALID_PASSWORD,
            'displayName' => 'Bad',
        ]);
        $this->assertResponseStatusCodeSame(400);
    }

    public function testRegisterValidatesPasswordStrength(): void
    {
        $client = static::createClient();
        $this->jsonPost($client, '/api/auth/register', [
            'email' => 'weak@example.com',
            'password' => 'short',
            'displayName' => 'Weak',
        ]);
        $this->assertResponseStatusCodeSame(400);
    }

    public function testLoginReturnsToken(): void
    {
        $client = static::createClient();
        $this->jsonPost($client, '/api/auth/register', [
            'email' => 'login@example.com',
            'password' => self::VALID_PASSWORD,
            'displayName' => 'Login User',
        ]);
        $this->jsonPost($client, '/api/auth/login', [
            'email' => 'login@example.com',
            'password' => self::VALID_PASSWORD,
        ]);
        $this->assertResponseIsSuccessful();
        $data = $this->jsonDecode($client->getResponse()->getContent());
        $this->assertArrayHasKey('token', $data);
        $this->assertArrayHasKey('user', $data);
    }

    public function testLoginRejectsWrongPassword(): void
    {
        $client = static::createClient();
        $this->jsonPost($client, '/api/auth/register', [
            'email' => 'wrong@example.com',
            'password' => self::VALID_PASSWORD,
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
            'password' => self::VALID_PASSWORD,
            'displayName' => 'Me User',
        ]);
        $token = $this->getTokenFromResponse($client);
        $client->request('GET', '/api/auth/me', [], [], [
            'HTTP_AUTHORIZATION' => "Bearer {$token}",
        ]);
        $this->assertResponseIsSuccessful();
        /** @var array{email: string, displayName: string} $data */
        $data = $this->jsonDecode($client->getResponse()->getContent());
        $this->assertEquals('me@example.com', $data['email']);
        $this->assertEquals('Me User', $data['displayName']);
    }

    public function testRegisterDefaultLocaleIsEn(): void
    {
        $client = static::createClient();
        $this->jsonPost($client, '/api/auth/register', [
            'email' => 'locale@example.com',
            'password' => self::VALID_PASSWORD,
            'displayName' => 'Locale User',
        ]);
        $this->assertResponseStatusCodeSame(201);
        /** @var array{user: array{locale: string}} $data */
        $data = $this->jsonDecode($client->getResponse()->getContent());
        $this->assertEquals('en', $data['user']['locale']);
    }

    public function testRegisterAcceptsLocale(): void
    {
        $client = static::createClient();
        $this->jsonPost($client, '/api/auth/register', [
            'email' => 'pl@example.com',
            'password' => self::VALID_PASSWORD,
            'displayName' => 'PL User',
            'locale' => 'pl',
        ]);
        $this->assertResponseStatusCodeSame(201);
        /** @var array{user: array{locale: string}} $data */
        $data = $this->jsonDecode($client->getResponse()->getContent());
        $this->assertEquals('pl', $data['user']['locale']);
    }

    public function testLoginResponseIncludesLocale(): void
    {
        $client = static::createClient();
        $this->jsonPost($client, '/api/auth/register', [
            'email' => 'loginlocale@example.com',
            'password' => self::VALID_PASSWORD,
            'displayName' => 'Login Locale',
            'locale' => 'pl',
        ]);
        $this->jsonPost($client, '/api/auth/login', [
            'email' => 'loginlocale@example.com',
            'password' => self::VALID_PASSWORD,
        ]);
        $this->assertResponseIsSuccessful();
        /** @var array{user: array{locale: string}} $data */
        $data = $this->jsonDecode($client->getResponse()->getContent());
        $this->assertEquals('pl', $data['user']['locale']);
    }

    public function testMeIncludesLocale(): void
    {
        $client = static::createClient();
        $this->jsonPost($client, '/api/auth/register', [
            'email' => 'melocale@example.com',
            'password' => self::VALID_PASSWORD,
            'displayName' => 'Me Locale',
        ]);
        $token = $this->getTokenFromResponse($client);
        $client->request('GET', '/api/auth/me', [], [], [
            'HTTP_AUTHORIZATION' => "Bearer {$token}",
        ]);
        $this->assertResponseIsSuccessful();
        /** @var array{locale: string} $data */
        $data = $this->jsonDecode($client->getResponse()->getContent());
        $this->assertArrayHasKey('locale', $data);
        $this->assertEquals('en', $data['locale']);
    }

    public function testPatchMeUpdatesLocale(): void
    {
        $client = static::createClient();
        $this->jsonPost($client, '/api/auth/register', [
            'email' => 'patch@example.com',
            'password' => self::VALID_PASSWORD,
            'displayName' => 'Patch User',
        ]);
        $token = $this->getTokenFromResponse($client);

        $client->request(
            'PATCH', '/api/auth/me', [], [],
            ['CONTENT_TYPE' => 'application/json', 'HTTP_AUTHORIZATION' => "Bearer {$token}"],
            (string) json_encode(['locale' => 'pl'])
        );
        $this->assertResponseIsSuccessful();
        /** @var array{locale: string} $data */
        $data = $this->jsonDecode($client->getResponse()->getContent());
        $this->assertEquals('pl', $data['locale']);
    }

    public function testPatchMeRejectsInvalidLocale(): void
    {
        $client = static::createClient();
        $this->jsonPost($client, '/api/auth/register', [
            'email' => 'patchbad@example.com',
            'password' => self::VALID_PASSWORD,
            'displayName' => 'Patch Bad',
        ]);
        $token = $this->getTokenFromResponse($client);

        $client->request(
            'PATCH', '/api/auth/me', [], [],
            ['CONTENT_TYPE' => 'application/json', 'HTTP_AUTHORIZATION' => "Bearer {$token}"],
            (string) json_encode(['locale' => 'de'])
        );
        $this->assertResponseStatusCodeSame(400);
    }

    public function testPatchMeRequiresAuth(): void
    {
        $client = static::createClient();
        $client->request(
            'PATCH', '/api/auth/me', [], [],
            ['CONTENT_TYPE' => 'application/json'],
            (string) json_encode(['locale' => 'pl'])
        );
        $this->assertResponseStatusCodeSame(401);
    }

    public function testRegisterUnsupportedLocaleDefaultsToEn(): void
    {
        $client = static::createClient();
        $this->jsonPost($client, '/api/auth/register', [
            'email' => 'unsupported@example.com',
            'password' => self::VALID_PASSWORD,
            'displayName' => 'Unsupported Locale',
            'locale' => 'de',
        ]);
        $this->assertResponseStatusCodeSame(201);
        /** @var array{user: array{locale: string}} $data */
        $data = $this->jsonDecode($client->getResponse()->getContent());
        $this->assertEquals('en', $data['user']['locale']);
    }

    public function testRegisterErrorTranslatedToPolish(): void
    {
        $client = static::createClient();
        $client->request(
            'POST', '/api/auth/register', [], [],
            ['CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT_LANGUAGE' => 'pl'],
            (string) json_encode(['email' => 'not-an-email', 'password' => self::VALID_PASSWORD, 'displayName' => 'X'])
        );
        $this->assertResponseStatusCodeSame(400);
        /** @var array{error: string} $data */
        $data = $this->jsonDecode($client->getResponse()->getContent());
        $this->assertEquals('Nieprawidłowy adres e-mail', $data['error']);
    }

    public function testRegisterDefaultThemeIsForest(): void
    {
        $client = static::createClient();
        $this->jsonPost($client, '/api/auth/register', [
            'email' => 'theme@example.com',
            'password' => self::VALID_PASSWORD,
            'displayName' => 'Theme User',
        ]);
        $this->assertResponseStatusCodeSame(201);
        /** @var array{user: array{theme: string}} $data */
        $data = $this->jsonDecode($client->getResponse()->getContent());
        $this->assertEquals('forest', $data['user']['theme']);
    }

    public function testLoginResponseIncludesTheme(): void
    {
        $client = static::createClient();
        $this->jsonPost($client, '/api/auth/register', [
            'email' => 'themelogin@example.com',
            'password' => self::VALID_PASSWORD,
            'displayName' => 'Theme Login',
        ]);
        $this->jsonPost($client, '/api/auth/login', [
            'email' => 'themelogin@example.com',
            'password' => self::VALID_PASSWORD,
        ]);
        $this->assertResponseIsSuccessful();
        /** @var array{user: array{theme: string}} $data */
        $data = $this->jsonDecode($client->getResponse()->getContent());
        $this->assertEquals('forest', $data['user']['theme']);
    }

    public function testPatchMeUpdatesTheme(): void
    {
        $client = static::createClient();
        $this->jsonPost($client, '/api/auth/register', [
            'email' => 'themepatch@example.com',
            'password' => self::VALID_PASSWORD,
            'displayName' => 'Theme Patch',
        ]);
        $token = $this->getTokenFromResponse($client);

        $client->request(
            'PATCH', '/api/auth/me', [], [],
            ['CONTENT_TYPE' => 'application/json', 'HTTP_AUTHORIZATION' => "Bearer {$token}"],
            (string) json_encode(['theme' => 'ocean'])
        );
        $this->assertResponseIsSuccessful();
        /** @var array{theme: string} $data */
        $data = $this->jsonDecode($client->getResponse()->getContent());
        $this->assertEquals('ocean', $data['theme']);
    }

    public function testPatchMeRejectsInvalidTheme(): void
    {
        $client = static::createClient();
        $this->jsonPost($client, '/api/auth/register', [
            'email' => 'themebad@example.com',
            'password' => self::VALID_PASSWORD,
            'displayName' => 'Theme Bad',
        ]);
        $token = $this->getTokenFromResponse($client);

        $client->request(
            'PATCH', '/api/auth/me', [], [],
            ['CONTENT_TYPE' => 'application/json', 'HTTP_AUTHORIZATION' => "Bearer {$token}"],
            (string) json_encode(['theme' => 'neon-rainbow'])
        );
        $this->assertResponseStatusCodeSame(400);
    }

    public function testPatchMeUpdatesCurrency(): void
    {
        $client = static::createClient();
        $this->jsonPost($client, '/api/auth/register', [
            'email' => 'currencypatch@example.com',
            'password' => self::VALID_PASSWORD,
            'displayName' => 'Currency Patch',
        ]);
        $token = $this->getTokenFromResponse($client);

        $client->request(
            'PATCH', '/api/auth/me', [], [],
            ['CONTENT_TYPE' => 'application/json', 'HTTP_AUTHORIZATION' => "Bearer {$token}"],
            (string) json_encode(['currency' => 'EUR'])
        );
        $this->assertResponseIsSuccessful();
        /** @var array{currency: string} $data */
        $data = $this->jsonDecode($client->getResponse()->getContent());
        $this->assertEquals('EUR', $data['currency']);
    }

    public function testPatchMeRejectsInvalidCurrency(): void
    {
        $client = static::createClient();
        $this->jsonPost($client, '/api/auth/register', [
            'email' => 'currencybad@example.com',
            'password' => self::VALID_PASSWORD,
            'displayName' => 'Currency Bad',
        ]);
        $token = $this->getTokenFromResponse($client);

        $client->request(
            'PATCH', '/api/auth/me', [], [],
            ['CONTENT_TYPE' => 'application/json', 'HTTP_AUTHORIZATION' => "Bearer {$token}"],
            (string) json_encode(['currency' => 'MOON'])
        );
        $this->assertResponseStatusCodeSame(400);
    }

    public function testRegisterCreatesDefaultCategories(): void
    {
        $client = static::createClient();
        $this->jsonPost($client, '/api/auth/register', [
            'email' => 'defaults@example.com',
            'password' => self::VALID_PASSWORD,
            'displayName' => 'Default User',
        ]);
        $this->assertResponseStatusCodeSame(201);
        $token = $this->getTokenFromResponse($client);

        $client->request(
            'GET', '/api/categories', [], [],
            ['HTTP_AUTHORIZATION' => "Bearer {$token}"]
        );
        $this->assertResponseIsSuccessful();
        /** @var array{'hydra:member': array<int, array<string, mixed>>} $data */
        $data = $this->jsonDecode($client->getResponse()->getContent());
        $members = $data['hydra:member'];
        $this->assertCount(2, $members);

        $names = array_column($members, 'name');
        $this->assertContains('General', $names);
        $this->assertContains('Salary', $names);

        $types = array_column($members, 'type');
        $this->assertContains('EXPENSE', $types);
        $this->assertContains('INCOME', $types);

        $colors = array_column($members, 'color');
        $this->assertContains('#9E9E9E', $colors);
        $this->assertContains('#4CAF50', $colors);

        $icons = array_column($members, 'icon');
        $this->assertContains('category', $icons);
        $this->assertContains('payments', $icons);
    }
}
