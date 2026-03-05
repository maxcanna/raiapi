package service

import (
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
	"go.mongodb.org/mongo-driver/v2/x/mongo/driver/connstring"

	"go.massi.dev/raiapi/internal/model"
)

type MongoCache struct {
	db *mongo.Database
}

func NewMongoCache(ctx context.Context, mongoURL string) (*MongoCache, error) {
	clientOptions := options.Client().ApplyURI(mongoURL)
	mongoClient, err := mongo.Connect(clientOptions)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to mongodb: %w", err)
	}

	// Verify connection
	if err := mongoClient.Ping(ctx, nil); err != nil {
		return nil, fmt.Errorf("failed to ping mongodb: %w", err)
	}

	dbName := "raiapi"
	cs, err := connstring.ParseAndValidate(mongoURL)
	if err == nil && cs.Database != "" {
		dbName = cs.Database
	}

	return &MongoCache{
		db: mongoClient.Database(dbName),
	}, nil
}

func (c *MongoCache) Get(ctx context.Context, key string) ([]model.RaiPlayEvent, error) {
	coll := c.db.Collection("programmi")
	var result model.ProgrammaCached
	err := coll.FindOne(ctx, bson.M{"_id": key}).Decode(&result)
	if err != nil {
		return nil, err
	}
	return result.Programmi, nil
}

func (c *MongoCache) Set(ctx context.Context, key string, programs []model.RaiPlayEvent) error {
	coll := c.db.Collection("programmi")
	filter := bson.M{"_id": key}
	update := bson.M{
		"$set": bson.M{
			"programmi": programs,
			"createdAt": time.Now(),
		},
	}
	opts := options.UpdateOne().SetUpsert(true)
	_, err := coll.UpdateOne(ctx, filter, update, opts)
	return err
}
