<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260501000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add theme column to user table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE "user" ADD theme VARCHAR(30) NOT NULL DEFAULT \'forest\'');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE "user" DROP COLUMN theme');
    }
}
