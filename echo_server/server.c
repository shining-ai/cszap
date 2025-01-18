#include <errno.h>
#include <netdb.h>
#include <pthread.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <time.h>
#include <unistd.h>
#include "utils.h"
#define BUFFER_SIZE 1024
int client_num = 0;
pthread_mutex_t client_num_mutex = PTHREAD_MUTEX_INITIALIZER;
volatile sig_atomic_t server_running = 1;
int socket_fd;

void handle_sigint(int sig)
{
    server_running = 0;
    close(socket_fd);
}

void *handle_client(void *client_socket)
{
    int client_socket_fd = *(int *)client_socket;
    free(client_socket);
    char buffer[BUFFER_SIZE];
    ssize_t bytes_received;

    while (1)
    {
        bytes_received = recv_with_error_handling(client_socket_fd, buffer, BUFFER_SIZE);
        if (bytes_received < 0)
        {
            break;
        }
        if (bytes_received == 0)
        {
            puts("temporarily error, retrying...");
            continue;
        }
        printf("Received: %s", buffer);

        // クライアントにデータを送り返す
        if (send_all(client_socket_fd, buffer, bytes_received) != bytes_received)
        {
            perror("Error sending data /n");
            break;
        }
    }
    close(client_socket_fd);
    pthread_mutex_lock(&client_num_mutex);
    client_num--;
    pthread_mutex_unlock(&client_num_mutex);
    return NULL;
}

int main(int argc, char *argv[])
{
    int port;
    int new_socket_fd;
    struct sockaddr_in6 server_addr, client_addr;
    socklen_t addr_len = sizeof(client_addr);
    struct sigaction sa;

    sigemptyset(&sa.sa_mask);
    sa.sa_handler = handle_sigint;
    sa.sa_flags = 0;
    if (sigaction(SIGINT, &sa, NULL) == -1)
    {
        perror("sigaction failed /n");
        return EXIT_FAILURE;
    }

    if (argc < 2)
    {
        printf("Usage: %s <port番号> \n", argv[0]);
        return EXIT_FAILURE;
    }

    if (valid_port(argv[1], &port) != 0)
    {
        return EXIT_FAILURE;
    }

    // ソケットの作成
    socket_fd = create_socket();
    if (socket_fd < 0)
    {
        return EXIT_FAILURE;
    }

    // アドレス設定
    server_addr.sin6_family = AF_INET6;
    server_addr.sin6_addr = in6addr_any;
    server_addr.sin6_port = htons(port);

    // ソケットにアドレスをバインド
    if (bind(socket_fd, (struct sockaddr *)&server_addr, sizeof(server_addr)) < 0)
    {
        perror("Error binding socket /n");
        close(socket_fd);
        return EXIT_FAILURE;
    }

    // クライアントからの接続を待ち受け
    if (listen(socket_fd, 50) < 0)
    {
        perror("Error listening /n");
        close(socket_fd);
        return EXIT_FAILURE;
    }
    printf("Echo server is running on port %d...\n", port);

    while (server_running)
    {
        puts("Waiting for client...");
        new_socket_fd = accept(socket_fd, (struct sockaddr *)&client_addr, &addr_len);
        if (new_socket_fd < 0)
        {
            if (errno == EINTR)
            {
                perror("Temporary error, retrying... /n");
                continue;
            }
            // 重大なエラーの場合は終了
            perror("Error accepting failed /n");
            break;
        }
        puts("Client connected.");
        client_num++;

        // クライアントを処理するスレッドを作成
        pthread_t tid;
        int *client_socket_fd = malloc(sizeof(int));
        if (client_socket_fd == NULL)
        {
            perror("Error allocating memory /n");
            close(new_socket_fd);
            continue;
        }
        *client_socket_fd = new_socket_fd;
        if (pthread_create(&tid, NULL, handle_client, client_socket_fd) != 0)
        {
            perror("Error creating thread /n");
            free(client_socket_fd);
            close(new_socket_fd);
            continue;
        }
        if (pthread_detach(tid) != 0)
        {
            perror("Error detaching thread /n");
        }
    }

    // 新規のクライアント接続を停止
    puts("Prepare server server stop...");
    time_t weight_seconds = 3;
    time_t current_time = time(NULL);
    time_t end_time = current_time + weight_seconds;
    while (client_num > 0 && current_time < end_time)
    {
        printf("Waiting for %d clients to disconnect...\n", client_num);
        current_time = time(NULL);
        sleep(1);
    }

    if (client_num > 0)
    {
        puts("Timeout. Force closing all clients...");
    }

    // ソケットを閉じる
    close(socket_fd);
}
