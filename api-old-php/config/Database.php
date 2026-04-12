<?php
// api/config/Database.php

class Database {
    private static $instance = null;
    private $pdo;

    private function __construct() {
        try {
            // Path relative to the script execution point (the root of /api)
            $dbPath = __DIR__ . '/../../gbetche.sqlite';
            $this->pdo = new PDO("sqlite:" . $dbPath);
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ATTR_ERRMODE_EXCEPTION);
            $this->pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            $this->init();
        } catch (PDOException $e) {
            die("Database connection failed: " . $e->getMessage());
        }
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance->pdo;
    }

    private function init() {
        $sql = "
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active INTEGER DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS words (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                french TEXT NOT NULL,
                fon TEXT NOT NULL,
                category TEXT,
                example TEXT,
                phonetic TEXT,
                audio_url TEXT,
                status TEXT DEFAULT 'pending',
                added_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (added_by) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS favorites (
                user_id INTEGER,
                word_id INTEGER,
                PRIMARY KEY (user_id, word_id),
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (word_id) REFERENCES words(id)
            );
        ";
        $this->pdo->exec($sql);

        // Initial admin user if not exists
        $stmt = $this->pdo->query("SELECT COUNT(*) FROM users WHERE role = 'admin'");
        if ($stmt->fetchColumn() == 0) {
            $pass = password_hash("Johnson40", PASSWORD_BCRYPT);
            $this->pdo->exec("INSERT INTO users (name, email, password, role) VALUES ('Admin Gbe Tche', 'eudesjohn650@gmail.com', '$pass', 'admin')");
            
            // Seed some data
            $this->pdo->exec("INSERT INTO words (french, fon, category, example, phonetic, status, added_by) VALUES 
                ('bonjour', 'kɔ́kú', 'salutations', 'Kɔ́kú, à ní cɛ ɖé?', 'ko-koo', 'approved', 1),
                ('merci', 'à wá', 'salutations', 'À wá kpɛ́dé', 'a-wa', 'approved', 1),
                ('eau', 'sin', 'nature', 'Sin ɖé mɛ', 'sin', 'approved', 1)
            ");
        }
    }
}
