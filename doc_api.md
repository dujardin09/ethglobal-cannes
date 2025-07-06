Parfait, c'est une excellente approche. Fournir une documentation claire pour l'API de l'agent est crucial pour que votre équipe front-end puisse l'intégrer facilement.

Voici une documentation complète et bien structurée que vous pouvez leur transmettre. Elle est rédigée dans un style standard (similaire à OpenAPI/Swagger) et explique tout ce qu'ils doivent savoir : les endpoints, les modèles de données, le flux de conversation et des exemples concrets.

---

## **Documentation de l'API de l'Agent Crypto Flow**

### **Version 1.0**

### **Introduction**

Cet agent IA permet de gérer des opérations sur la blockchain Flow via une interface conversationnelle. Il peut comprendre des demandes en langage naturel pour staker des tokens, effectuer des swaps, et vérifier des soldes. Il maintient également un historique de conversation pour comprendre le contexte des demandes de suivi.

L'interaction avec l'agent se fait via des requêtes HTTP POST vers un unique endpoint.

### **Informations Générales**

*   **URL de base de l'Agent :** `http://127.0.0.1:8001` (ou l'URL où l'agent est déployé)
*   **Endpoint Principal :** `/submit`
*   **Méthode HTTP :** `POST`
*   **Format des Données :** `application/json`

L'agent est *stateful* : il conserve un historique de conversation basé sur le `user_id` fourni dans chaque requête. Il est donc essentiel de fournir un `user_id` stable pour chaque session utilisateur.

---

### **Flux de Communication**

Le dialogue avec l'agent suit un cycle requête/réponse simple mais peut inclure une étape de confirmation pour les actions critiques.

1.  **Le Client envoie un message** (`UserMessage`) à l'agent.
2.  **L'Agent répond** avec une `ActionResponse`.
    *   **Cas A : Réponse simple.** La conversation continue.
    *   **Cas B : Demande de confirmation.** La réponse contient `requires_confirmation: true` et un `action_id`.
3.  **Si confirmation requise**, le client doit envoyer un message de confirmation (`ConfirmationMessage`) en utilisant l'`action_id` reçu.

---

### **Endpoints de l'API**

#### 1. Envoyer un Message ou une Confirmation

C'est l'unique endpoint pour toute communication avec l'agent. Le type de message envoyé (`UserMessage` ou `ConfirmationMessage`) détermine comment l'agent le traite.

*   **URL :** `/submit`
*   **Méthode :** `POST`
*   **Headers :**
    *   `Content-Type: application/json`
    *   `x-uagents-sender`: L'adresse de votre client (si vous en avez une, sinon peut être omis pour les tests simples).
    *   `x-uagents-schema-digest`: Le "digest" du modèle de données envoyé. La bibliothèque `uagents` gère cela automatiquement. *Note pour les développeurs front-end : vous devrez calculer ce digest.*

> **Note importante pour le front-end :**
> L'écosystème uAgents utilise un `schema_digest` pour s'assurer que l'expéditeur et le destinataire "parlent" de la même structure de données. Vous devrez utiliser une bibliothèque ou une fonction pour générer ce digest SHA-256 à partir de la structure JSON de votre message.
>
> **Exemple de calcul du digest pour `UserMessage` en JavaScript :**
>
> ```javascript
> import { createHash } from 'crypto';
>
> // 1. Définir la structure du modèle comme dans le code Python
> const modelDefinition = `{"title":"UserMessage","type":"object","properties":{"content":{"title":"Content","type":"string"},"user_id":{"title":"UserId","type":"string"}},"required":["content","user_id"]}`;
>
> // 2. Trier les clés de l'objet (si nécessaire, ici c'est déjà une string)
> // 3. Calculer le hash
> const schemaDigest = createHash('sha256').update(modelDefinition).digest('hex');
>
> // Ce digest doit être inclus dans le header x-uagents-schema-digest
> // Le digest pour UserMessage est: 1da7327702f23243f65e2b2add564993a408226e45f94a85b98466e3199bf723
> ```
>
> Pour simplifier, voici les digests pré-calculés pour les modèles de l'agent :
> *   `UserMessage`: `1da7327702f23243f65e2b2add564993a408226e45f94a85b98466e3199bf723`
> *   `ConfirmationMessage`: `737f5945899eb3c8376483df14a7065050935517b669749176465451e24a480d`

---

### **Modèles de Données (Data Models)**

#### **Envoi de Messages par le Client**

**1. `UserMessage`** (Pour envoyer un message de chat normal)

*   **Digest :** `1da7327702f23243f65e2b2add564993a408226e45f94a85b98466e3199bf723`

| Champ     | Type   | Obligatoire | Description                                                               |
| :-------- | :----- | :---------- | :------------------------------------------------------------------------ |
| `content` | string | Oui         | Le message textuel de l'utilisateur (ex: "Je veux staker 100 FLOW").      |
| `user_id` | string | Oui         | Un identifiant unique et persistant pour la session de l'utilisateur.     |

**Exemple de requête `POST /submit` avec `UserMessage` :**
```json
// Headers
{
  "Content-Type": "application/json",
  "x-uagents-schema-digest": "1da7327702f23243f65e2b2add564993a408226e45f94a85b98466e3199bf723"
}

// Body
{
  "content": "Je veux staker 100 FLOW",
  "user_id": "user-session-abc-123"
}
```

**2. `ConfirmationMessage`** (Pour répondre à une demande de confirmation)

*   **Digest :** `737f5945899eb3c8376483df14a7065050935517b669749176465451e24a480d`

| Champ         | Type    | Obligatoire | Description                                                                  |
| :------------ | :------ | :---------- | :--------------------------------------------------------------------------- |
| `action_id`   | string  | Oui         | L'ID de l'action reçu dans la réponse `ActionResponse` précédente.           |
| `confirmed`   | boolean | Oui         | `true` si l'utilisateur confirme l'action, `false` s'il l'annule.            |
| `user_id`     | string  | Oui         | Le même `user_id` que celui de la session en cours.                          |

**Exemple de requête `POST /submit` avec `ConfirmationMessage` :**
```json
// Headers
{
  "Content-Type": "application/json",
  "x-uagents-schema-digest": "737f5945899eb3c8376483df14a7065050935517b669749176465451e24a480d"
}

// Body
{
  "action_id": "user-session-abc-123_a4e8c1f9",
  "confirmed": true,
  "user_id": "user-session-abc-123"
}
```

---

#### **Réponse de l'Agent**

**`ActionResponse`**

L'agent répond toujours avec ce modèle.

| Champ                   | Type               | Description                                                                                                                                                             |
| :---------------------- | :----------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `success`               | boolean            | `true` si la requête a été traitée avec succès (même si l'IA n'a pas compris), `false` en cas d'erreur interne majeure.                                                 |
| `message`               | string             | Le message textuel de l'agent à afficher à l'utilisateur. Peut contenir la réponse, une question, ou une demande de confirmation.                                         |
| `function_call`         | string ou `null`   | (Optionnel) Une représentation textuelle de la fonction qui serait appelée (ex: `stake_tokens(100, "dapper")`). Utile pour le débogage ou pour affichage.              |
| `function_result`       | string ou `null`   | (Optionnel) Le résultat de l'exécution d'une fonction (actuellement simulé).                                                                                             |
| `requires_confirmation` | boolean            | `true` si l'agent a besoin d'une confirmation de l'utilisateur pour procéder. Si c'est le cas, `action_id` sera également fourni.                                        |
| `action_id`             | string ou `null`   | (Optionnel) Un identifiant unique pour une action en attente de confirmation. **Cet ID doit être renvoyé dans un `ConfirmationMessage`**.                                |

**Exemple 1 : Réponse conversationnelle simple**
```json
{
  "success": true,
  "message": "Bonjour ! Comment puis-je vous aider avec vos opérations sur Flow aujourd'hui ?",
  "function_call": null,
  "function_result": null,
  "requires_confirmation": false,
  "action_id": null
}
```

**Exemple 2 : Demande de confirmation**
```json
{
  "success": true,
  "message": "Parfait ! Je vais préparer le staking de 100 FLOW avec le validator Dapper.\n\n⚠️ Confirmation requise : Staker 100 FLOW avec le validateur Dapper ? (oui/non)",
  "function_call": null,
  "function_result": null,
  "requires_confirmation": true,
  "action_id": "user-session-abc-123_a4e8c1f9"
}
```

**Exemple 3 : Confirmation d'une action exécutée**
```json
{
  "success": true,
  "message": "Parfait ! Votre action 'stake' a été confirmée et est en cours d'exécution. Appel de fonction : `stake_tokens(100.0, \"dapper\")`",
  "function_call": "stake_tokens(100.0, \"dapper\")",
  "function_result": "{\"success\": true, \"message\": \"Simulation d'exécution réussie\"}",
  "requires_confirmation": false,
  "action_id": null
}
```

---

### **Exemple de Flux Complet (Staking)**

1.  **Client → Agent :** L'utilisateur lance la conversation.
    *   **Header `x-uagents-schema-digest`:** `...UserMessage...`
    *   **Body :** `{ "content": "je veux staker", "user_id": "react-user-42" }`

2.  **Agent → Client :** L'agent demande plus d'informations.
    *   **Body de réponse :**
        ```json
        {
          "success": true,
          "message": "Bien sûr ! Combien de FLOW souhaitez-vous staker et avec quel validateur ?",
          "requires_confirmation": false,
          "action_id": null
        }
        ```

3.  **Client → Agent :** L'utilisateur fournit les informations manquantes.
    *   **Header `x-uagents-schema-digest`:** `...UserMessage...`
    *   **Body :** `{ "content": "150 FLOW avec blocto", "user_id": "react-user-42" }`

4.  **Agent → Client :** L'agent a toutes les informations et demande une confirmation finale.
    *   **Body de réponse :**
        ```json
        {
          "success": true,
          "message": "Excellent. Je prépare le staking de 150 FLOW avec le validateur Blocto.\n\n⚠️ Confirmez-vous cette action ?",
          "requires_confirmation": true,
          "action_id": "react-user-42_f1b3e4a5"
        }
        ```
    *   Le front-end doit maintenant afficher le message et proposer des boutons "Confirmer" / "Annuler", et **stocker l'`action_id`**.

5.  **Client → Agent :** L'utilisateur clique sur "Confirmer".
    *   **Header `x-uagents-schema-digest`:** `...ConfirmationMessage...`
    *   **Body :** `{ "action_id": "react-user-42_f1b3e4a5", "confirmed": true, "user_id": "react-user-42" }`

6.  **Agent → Client :** L'agent confirme l'exécution.
    *   **Body de réponse :**
        ```json
        {
          "success": true,
          "message": "Action confirmée et exécutée ! ...",
          "requires_confirmation": false,
          "action_id": null
        }
        ```