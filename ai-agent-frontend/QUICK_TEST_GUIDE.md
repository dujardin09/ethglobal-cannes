# Guide rapide pour tester le formatage GPT-4o-mini

## Étape 1: Obtenir une clé API OpenAI

1. Allez sur [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Connectez-vous ou créez un compte
3. Cliquez sur "Create new secret key"
4. Copiez la clé générée

## Étape 2: Configurer la variable d'environnement

Créez un fichier `.env.local` dans le dossier `ai-agent-frontend` :

```bash
# Configuration de l'agent AI
NEXT_PUBLIC_AGENT_URL=http://127.0.0.1:8001

# Configuration OpenAI pour le formatage des résultats
NEXT_PUBLIC_OPENAI_API_KEY=sk-your-actual-api-key-here
```

## Étape 3: Redémarrer le serveur

```bash
npm run dev
```

## Étape 4: Tester le formatage

1. **Démarrez l'agent Python** (si pas déjà fait) :
   ```bash
   cd ../ai_agent_special
   python agent_special.py
   ```

2. **Testez depuis le frontend** :
   - Ouvrez http://localhost:3000
   - Dites "Je veux staker 100 FLOW"
   - Confirmez l'action
   - Vous devriez voir le résultat formaté par GPT-4o-mini

## Étape 5: Vérifier les logs

Dans la console du navigateur, vous devriez voir :
```
🔔 Formatage du résultat avec GPT-4o-mini...
```

## Résultat attendu

**Avant (message technique) :**
```
🎉 Excellent ! Staking de 100.0 FLOW avec None (fonction à implémenter)
```

**Après (formaté par GPT-4o-mini) :**
```
🎉 Félicitations ! Votre staking de 100 FLOW a été effectué avec succès !

💰 Montant staké : 100 FLOW
🏦 Validateur : None
⏰ Statut : En cours de traitement

Vos tokens sont maintenant en sécurité et commencent à générer des rendements ! 🚀
```

## Dépannage

### Si le formatage ne se déclenche pas :
1. Vérifiez que `NEXT_PUBLIC_OPENAI_API_KEY` est défini
2. Vérifiez que l'agent Python renvoie `function_result`
3. Vérifiez les logs dans la console du navigateur

### Si l'API OpenAI échoue :
1. Vérifiez que votre clé API est valide
2. Vérifiez votre quota OpenAI
3. Le système utilisera automatiquement le formatage simple comme fallback 