<?php

namespace App\Controller;

use App\Entity\Category;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Contracts\Translation\TranslatorInterface;

class AuthController extends AbstractController
{
    private const SUPPORTED_LOCALES    = ['en', 'pl'];
    private const SUPPORTED_THEMES     = ['forest', 'ocean', 'aubergine', 'sunset', 'slate', 'rose'];
    private const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'PLN', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY'];

    public function __construct(private readonly TranslatorInterface $translator) {}

    #[Route('/api/auth/register', name: 'auth_register', methods: ['POST'])]
    public function register(
        Request $request,
        UserPasswordHasherInterface $hasher,
        EntityManagerInterface $em,
        JWTTokenManagerInterface $jwtManager,
    ): JsonResponse {
        $data = json_decode($request->getContent(), true) ?? [];
        $email = strtolower(trim((string) ($data['email'] ?? '')));
        $password = (string) ($data['password'] ?? '');
        $displayName = trim((string) ($data['displayName'] ?? ''));
        $locale = (string) ($data['locale'] ?? 'en');

        if ($email === '' || $password === '' || $displayName === '') {
            return $this->json(['error' => $this->translator->trans('error.auth.email_required')], Response::HTTP_BAD_REQUEST);
        }
        if (mb_strlen($displayName) > 255) {
            return $this->json(['error' => $this->translator->trans('error.auth.display_name_too_long')], Response::HTTP_BAD_REQUEST);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->json(['error' => $this->translator->trans('error.auth.invalid_email')], Response::HTTP_BAD_REQUEST);
        }
        if (strlen($password) < 12 || !preg_match('/[A-Z]/', $password) || !preg_match('/[0-9]/', $password) || !preg_match('/[^A-Za-z0-9]/', $password)) {
            return $this->json(['error' => $this->translator->trans('error.auth.password_too_weak')], Response::HTTP_BAD_REQUEST);
        }
        if ($em->getRepository(User::class)->findOneBy(['email' => $email])) {
            return $this->json(['error' => $this->translator->trans('error.auth.email_taken')], Response::HTTP_CONFLICT);
        }
        if (!in_array($locale, self::SUPPORTED_LOCALES, true)) {
            $locale = 'en';
        }

        $user = new User();
        $user->setEmail($email);
        $user->setDisplayName($displayName);
        $user->setPassword($hasher->hashPassword($user, $password));
        $user->setLocale($locale);

        $em->persist($user);

        $generalCategory = (new Category())
            ->setName($this->translator->trans('category.default.general', [], null, $locale))
            ->setType('EXPENSE')
            ->setColor('#9E9E9E')
            ->setIcon('category')
            ->setUser($user);

        $salaryCategory = (new Category())
            ->setName($this->translator->trans('category.default.salary', [], null, $locale))
            ->setType('INCOME')
            ->setColor('#4CAF50')
            ->setIcon('payments')
            ->setUser($user);

        $em->persist($generalCategory);
        $em->persist($salaryCategory);

        $em->flush();

        return $this->json([
            'token' => $jwtManager->create($user),
            'user'  => $this->userPayload($user),
        ], Response::HTTP_CREATED);
    }

    #[Route('/api/auth/me', name: 'auth_me', methods: ['GET'])]
    public function me(): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            throw $this->createAccessDeniedException();
        }

        return $this->json($this->userPayload($user));
    }

    #[Route('/api/auth/me', name: 'auth_me_patch', methods: ['PATCH'])]
    public function patchMe(
        Request $request,
        EntityManagerInterface $em,
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            throw $this->createAccessDeniedException();
        }

        $data = json_decode($request->getContent(), true) ?? [];

        if (array_key_exists('locale', $data)) {
            $locale = (string) $data['locale'];
            if (!in_array($locale, self::SUPPORTED_LOCALES, true)) {
                return $this->json(['error' => $this->translator->trans('error.auth.invalid_locale')], Response::HTTP_BAD_REQUEST);
            }
            $user->setLocale($locale);
        }

        if (array_key_exists('theme', $data)) {
            $theme = (string) $data['theme'];
            if (!in_array($theme, self::SUPPORTED_THEMES, true)) {
                return $this->json(['error' => $this->translator->trans('error.auth.invalid_theme', ['%themes%' => implode(', ', self::SUPPORTED_THEMES)])], Response::HTTP_BAD_REQUEST);
            }
            $user->setTheme($theme);
        }

        if (array_key_exists('currency', $data)) {
            $currency = (string) $data['currency'];
            if (!in_array($currency, self::SUPPORTED_CURRENCIES, true)) {
                return $this->json(['error' => $this->translator->trans('error.auth.invalid_currency', ['%currencies%' => implode(', ', self::SUPPORTED_CURRENCIES)])], Response::HTTP_BAD_REQUEST);
            }
            $user->setCurrency($currency);
        }

        $em->flush();

        return $this->json($this->userPayload($user));
    }

    private function userPayload(User $user): array
    {
        return [
            'id'          => $user->getId(),
            'email'       => $user->getEmail(),
            'displayName' => $user->getDisplayName(),
            'currency'    => $user->getCurrency(),
            'locale'      => $user->getLocale(),
            'theme'       => $user->getTheme(),
        ];
    }
}