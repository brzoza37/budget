<?php

use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Output\NullOutput;
use Symfony\Component\Dotenv\Dotenv;

require dirname(__DIR__).'/vendor/autoload.php';

if (method_exists(Dotenv::class, 'bootEnv')) {
    (new Dotenv())->bootEnv(dirname(__DIR__).'/.env');
}

if ($_SERVER['APP_DEBUG'] ?? false) {
    umask(0000);
}

$kernel = new \App\Kernel('test', false);
$app = new Application($kernel);
$app->setAutoExit(false);

$app->run(new ArrayInput(['command' => 'doctrine:database:create', '--if-not-exists' => true]), new NullOutput());
$app->run(new ArrayInput(['command' => 'doctrine:schema:drop', '--force' => true]), new NullOutput());
$app->run(new ArrayInput(['command' => 'doctrine:schema:create']), new NullOutput());
