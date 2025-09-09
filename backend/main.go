package main

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"sync/atomic"
	"time"

	"github.com/gorilla/websocket"
)

type Stats struct {
	Accepted int64 `json:"accepted"`
	Rejected int64 `json:"rejected"`
	Errors   int64 `json:"errors"`
}

var accepted, rejected, errors int64

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func main() {
	http.HandleFunc("/start-test", startTestHandler)
	http.HandleFunc("/ws", wsHandler)

	log.Println("Server started at :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
func enableCors(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

type TestRequest struct {
	URL         string `json:"url"`
	Payload     string `json:"payload"`
	TotalReq    int    `json:"totalRequests"`
	Concurrency int    `json:"concurrency"`
}

func startTestHandler(w http.ResponseWriter, r *http.Request) {
	enableCors(w)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req TestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	atomic.StoreInt64(&accepted, 0)
	atomic.StoreInt64(&rejected, 0)
	atomic.StoreInt64(&errors, 0)

	go startTest(req.URL, req.Payload, req.TotalReq, req.Concurrency)
	w.WriteHeader(http.StatusOK)
}

func startTest(url, payload string, total, concurrency int) {
	sem := make(chan struct{}, concurrency)
	for i := 0; i < total; i++ {
		sem <- struct{}{}
		go func() {
			defer func() { <-sem }()
			resp, err := http.Post(url, "application/json", bytes.NewBuffer([]byte(payload)))
			if err != nil {
				atomic.AddInt64(&errors, 1)
				return
			}
			defer resp.Body.Close()
			if resp.StatusCode >= 200 && resp.StatusCode < 300 {
				atomic.AddInt64(&accepted, 1)
			} else {
				atomic.AddInt64(&rejected, 1)
			}
		}()
	}

	for i := 0; i < cap(sem); i++ {
		sem <- struct{}{}
	}
}

func wsHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WS upgrade error:", err)
		return
	}
	defer conn.Close()

	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		secStats := Stats{
			Accepted: atomic.SwapInt64(&accepted, 0),
			Rejected: atomic.SwapInt64(&rejected, 0),
			Errors:   atomic.SwapInt64(&errors, 0),
		}

		if err := conn.WriteJSON(secStats); err != nil {
			log.Println("WS write error:", err)
			break
		}
	}
}
