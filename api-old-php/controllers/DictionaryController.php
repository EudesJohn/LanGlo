<?php
// api/controllers/DictionaryController.php

require_once __DIR__ . '/../config/Database.php';

class DictionaryController {
    public static function getAll() {
        $db = Database::getInstance();
        return $db->query("SELECT * FROM words WHERE status = 'approved' ORDER BY created_at DESC")->fetchAll();
    }

    public static function search($q) {
        $db = Database::getInstance();
        $stmt = $db->prepare("SELECT * FROM words WHERE (french LIKE ? OR fon LIKE ?) AND status = 'approved'");
        $stmt->execute(["%$q%", "%$q%"]);
        return $stmt->fetchAll();
    }

    public static function addSuggestion($data, $userId) {
        $db = Database::getInstance();
        $stmt = $db->prepare("INSERT INTO words (french, fon, category, example, phonetic, added_by) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $data['french'], $data['fon'], $data['category'], 
            $data['example'], $data['phonetic'], $userId
        ]);
        return ["success" => true, "message" => "Suggestion envoyée pour validation."];
    }

    public static function getFavorites($userId) {
        $db = Database::getInstance();
        $stmt = $db->prepare("SELECT w.* FROM words w JOIN favorites f ON w.id = f.word_id WHERE f.user_id = ?");
        $stmt->execute([$userId]);
        return $stmt->fetchAll();
    }

    public static function toggleFavorite($userId, $wordId) {
        $db = Database::getInstance();
        $stmt = $db->prepare("SELECT FROM favorites WHERE user_id = ? AND word_id = ?");
        $stmt->execute([$userId, $wordId]);
        if ($stmt->fetch()) {
            $stmt = $db->prepare("DELETE FROM favorites WHERE user_id = ? AND word_id = ?");
            $stmt->execute([$userId, $wordId]);
            return ["status" => "removed"];
        }
        $stmt = $db->prepare("INSERT INTO favorites (user_id, word_id) VALUES (?, ?)");
        $stmt->execute([$userId, $wordId]);
        return ["status" => "added"];
    }
}
