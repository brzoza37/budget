<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260502000002 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add original_currency and original_amount to transaction';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE transaction ADD COLUMN original_currency VARCHAR(3) NULL');
        $this->addSql('ALTER TABLE transaction ADD COLUMN original_amount DOUBLE PRECISION NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE transaction DROP COLUMN original_currency');
        $this->addSql('ALTER TABLE transaction DROP COLUMN original_amount');
    }
}
