<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260429000002 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Insert seed user and assign all existing rows to that user';
    }

    public function up(Schema $schema): void
    {
        // password_hash('Admin1234!', PASSWORD_BCRYPT, ['cost' => 10])
        // Pre-computed to avoid runtime PHP in addSql — change password after first login
        $hash = password_hash('Admin1234!', PASSWORD_BCRYPT, ['cost' => 10]);

        $this->connection->executeStatement(
            'INSERT INTO "user" (email, password, display_name, currency, roles, created_at)
             VALUES (:email, :password, :displayName, :currency, :roles, NOW())',
            [
                'email' => 'admin@localhost',
                'password' => $hash,
                'displayName' => 'Admin',
                'currency' => 'USD',
                'roles' => '[]',
            ]
        );

        foreach (['account', 'category', 'transaction', 'budget', 'recurring_event', 'planned_item'] as $table) {
            $this->connection->executeStatement(
                "UPDATE \"$table\" SET user_id = (SELECT id FROM \"user\" WHERE email = 'admin@localhost') WHERE user_id IS NULL"
            );
        }
    }

    public function down(Schema $schema): void
    {
        foreach (['account', 'category', 'transaction', 'budget', 'recurring_event', 'planned_item'] as $table) {
            $this->connection->executeStatement("UPDATE \"$table\" SET user_id = NULL");
        }
        $this->connection->executeStatement("DELETE FROM \"user\" WHERE email = 'admin@localhost'");
    }
}
