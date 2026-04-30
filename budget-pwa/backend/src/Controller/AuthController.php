<?php

namespace App\Controller;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;

class AuthController extends AbstractController
{
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

        if ($email === '' || $password === '' || $displayName === '') {
            return $this->json(['error' => 'email, password, and displayName are required'], Response::HTTP_BAD_REQUEST);
        }
        if (mb_strlen($displayName) > 255) {
            return $this->json(['error' => 'displayName must not exceed 255 characters'], Response::HTTP_BAD_REQUEST);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->json(['error' => 'Invalid email address'], Response::HTTP_BAD_REQUEST);
        }
        if (strlen($password) < 12 || !preg_match('/[A-Z]/', $password) || !preg_match('/[0-9]/', $password) || !preg_match('/[^A-Za-z0-9]/', $password)) {
            return $this->json(['error' => 'Password must be at least 12 characters and contain an uppercase letter, a number, and a special character'], Response::HTTP_BAD_REQUEST);
        }
        if ($em->getRepository(User::class)->findOneBy(['email' => $email])) {
            return $this->json(['error' => 'Email already registered'], Response::HTTP_CONFLICT);
        }

        $user = new User();
        $user->setEmail($email);
        $user->setDisplayName($displayName);
        $user->setPassword($hasher->hashPassword($user, $password));

        $em->persist($user);
        $em->flush();

        return $this->json([
            'token' => $jwtManager->create($user),
            'user' => [
                'id' => $user->getId(),
                'email' => $user->getEmail(),
                'displayName' => $user->getDisplayName(),
                'currency' => $user->getCurrency(),
            ],
        ], Response::HTTP_CREATED);
    }

    #[Route('/api/auth/me', name: 'auth_me', methods: ['GET'])]
    public function me(): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            throw $this->createAccessDeniedException();
        }

        return $this->json([
            'id' => $user->getId(),
            'email' => $user->getEmail(),
            'displayName' => $user->getDisplayName(),
            'currency' => $user->getCurrency(),
        ]);
    }
}
