<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260429000003 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Make user_id NOT NULL on all data tables';
    }

    public function up(Schema $schema): void
    {
        foreach (['account', 'category', 'transaction', 'budget', 'recurring_event', 'planned_item'] as $table) {
            $this->addSql("ALTER TABLE \"$table\" ALTER COLUMN user_id SET NOT NULL");
        }
    }

    public function down(Schema $schema): void
    {
        foreach (['account', 'category', 'transaction', 'budget', 'recurring_event', 'planned_item'] as $table) {
            $this->addSql("ALTER TABLE \"$table\" ALTER COLUMN user_id DROP NOT NULL");
        }
    }
}
