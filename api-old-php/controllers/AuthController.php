<?php
// api/controllers/AuthController.php

require_once __DIR__ . '/../config/Database.php';

class AuthController {
    public static function register($data) {
        $db = Database::getInstance();
        $hashed = password_hash($data['password'], PASSWORD_BCRYPT);
        
        try {
            $stmt = $db->prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
            $stmt->execute([$data['name'], $data['email'], $hashed]);
            return ["success" => true, "message" => "Compte créé !"];
        } catch (PDOException $e) {
            return ["success" => false, "message" => "L'email est déjà utilisé."];
        }
    }

    public static function login($data) {
        $db = Database::getInstance();
        $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$data['email']]);
        $user = $stmt->fetch();

        if ($user && password_verify($data['password'], $user['password'])) {
            unset($user['password']);
            $token = bin2hex(random_bytes(16));
            return ["success" => true, "user" => $user, "token" => $token];
        }
        return ["success" => false, "message" => "Email ou mot de passe incorrect."];
    }
}
