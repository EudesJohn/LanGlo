<?php
// api/index.php

session_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/DictionaryController.php';
require_once __DIR__ . '/controllers/AdminController.php';

$requestUri = explode('?', $_SERVER['REQUEST_URI'], 2)[0];
$uriParts = explode('/', trim($requestUri, '/'));

// Expected path: /api/resource/action
// On some local servers, 'api' might be in the path already, so we skip it if found.
if ($uriParts[0] === 'api') {
    array_shift($uriParts);
}

$resource = $uriParts[0] ?? null;
$action = $uriParts[1] ?? null;

$input = json_decode(file_get_contents("php://input"), true);
$userId = $_SESSION['user_id'] ?? null;
$role = $_SESSION['role'] ?? 'guest';

switch ($resource) {
    case 'auth':
        handleAuth($action, $input);
        break;
    case 'dictionary':
        handleDictionary($action, $input, $userId, $role);
        break;
    default:
        echo json_encode(["status" => "API Online", "v" => "1.0-modular"]);
        break;
}

function handleAuth($action, $input) {
    switch ($action) {
        case 'login':
            $res = AuthController::login($input);
            if ($res['success']) {
                $_SESSION['user_id'] = $res['user']['id'];
                $_SESSION['role'] = $res['user']['role'];
            }
            echo json_encode($res);
            break;
        case 'register':
            echo json_encode(AuthController::register($input));
            break;
        case 'logout':
            session_destroy();
            echo json_encode(["success" => true]);
            break;
        default:
            http_response_code(404);
            break;
    }
}

function handleDictionary($action, $input, $userId, $role) {
    switch ($action) {
        case 'search':
            echo json_encode(DictionaryController::search($_GET['q'] ?? ''));
            break;
        case 'add':
            if (!$userId) return http_response_code(401);
            echo json_encode(DictionaryController::addSuggestion($input, $userId));
            break;
        case 'admin-pending':
            if ($role !== 'admin') return http_response_code(403);
            echo json_encode(AdminController::getPending());
            break;
        case 'admin-approve':
            if ($role !== 'admin') return http_response_code(403);
            echo json_encode(AdminController::approve($input['id']));
            break;
        case 'admin-reject':
            if ($role !== 'admin') return http_response_code(403);
            echo json_encode(AdminController::reject($input['id']));
            break;
        case 'favorites':
            if (!$userId) return http_response_code(401);
            echo json_encode(DictionaryController::getFavorites($userId));
            break;
        case 'toggle-fav':
            if (!$userId) return http_response_code(401);
            echo json_encode(DictionaryController::toggleFavorite($userId, $_GET['word_id']));
            break;
        default:
            echo json_encode(DictionaryController::getAll());
            break;
    }
}
