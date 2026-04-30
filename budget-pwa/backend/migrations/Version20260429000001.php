<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260429000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add user table and nullable user_id FK columns to all data tables';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE "user" (
            id SERIAL NOT NULL,
            email VARCHAR(180) NOT NULL,
            password VARCHAR(255) NOT NULL,
            display_name VARCHAR(255) NOT NULL,
            currency VARCHAR(3) NOT NULL DEFAULT \'USD\',
            roles JSON NOT NULL,
            created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            PRIMARY KEY(id)
        )');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_8D93D649E7927C74 ON "user" (email)');
        $this->addSql('COMMENT ON COLUMN "user".created_at IS \'(DC2Type:datetime_immutable)\'');

        $this->addSql('ALTER TABLE account ADD COLUMN user_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE category ADD COLUMN user_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE transaction ADD COLUMN user_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE budget ADD COLUMN user_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE recurring_event ADD COLUMN user_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE planned_item ADD COLUMN user_id INT DEFAULT NULL');

        $this->addSql('ALTER TABLE account ADD CONSTRAINT FK_account_user FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE category ADD CONSTRAINT FK_category_user FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE transaction ADD CONSTRAINT FK_transaction_user FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE budget ADD CONSTRAINT FK_budget_user FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE recurring_event ADD CONSTRAINT FK_recurring_event_user FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE planned_item ADD CONSTRAINT FK_planned_item_user FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');

        $this->addSql('CREATE INDEX IDX_account_user ON account (user_id)');
        $this->addSql('CREATE INDEX IDX_category_user ON category (user_id)');
        $this->addSql('CREATE INDEX IDX_transaction_user ON transaction (user_id)');
        $this->addSql('CREATE INDEX IDX_budget_user ON budget (user_id)');
        $this->addSql('CREATE INDEX IDX_recurring_event_user ON recurring_event (user_id)');
        $this->addSql('CREATE INDEX IDX_planned_item_user ON planned_item (user_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE account DROP CONSTRAINT FK_account_user');
        $this->addSql('ALTER TABLE category DROP CONSTRAINT FK_category_user');
        $this->addSql('ALTER TABLE transaction DROP CONSTRAINT FK_transaction_user');
        $this->addSql('ALTER TABLE budget DROP CONSTRAINT FK_budget_user');
        $this->addSql('ALTER TABLE recurring_event DROP CONSTRAINT FK_recurring_event_user');
        $this->addSql('ALTER TABLE planned_item DROP CONSTRAINT FK_planned_item_user');

        $this->addSql('ALTER TABLE account DROP COLUMN user_id');
        $this->addSql('ALTER TABLE category DROP COLUMN user_id');
        $this->addSql('ALTER TABLE transaction DROP COLUMN user_id');
        $this->addSql('ALTER TABLE budget DROP COLUMN user_id');
        $this->addSql('ALTER TABLE recurring_event DROP COLUMN user_id');
        $this->addSql('ALTER TABLE planned_item DROP COLUMN user_id');

        $this->addSql('DROP TABLE "user"');
    }
}
