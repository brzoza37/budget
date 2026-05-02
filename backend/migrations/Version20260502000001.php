<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260502000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create exchange_rate table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("CREATE TABLE exchange_rate (
            id SERIAL NOT NULL,
            target_currency VARCHAR(3) NOT NULL,
            rate DOUBLE PRECISION NOT NULL,
            fetched_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            PRIMARY KEY(id)
        )");
        $this->addSql('CREATE UNIQUE INDEX uniq_exchange_rate_currency ON exchange_rate (target_currency)');
        $this->addSql("COMMENT ON COLUMN exchange_rate.fetched_at IS '(DC2Type:datetime_immutable)'");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE exchange_rate');
    }
}
