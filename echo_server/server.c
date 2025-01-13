#include <stdio.h>
#include <unistd.h>
#include <sys/socket.h>
#include <netdb.h>
#include <string.h>
#include <signal.h>
#include <pthread.h>
#include <stdlib.h>
#define BUFFER_SIZE 1024
volatile int client_num = 0;
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
    int bytes_read;

    while (1)
    {
        memset(buffer, 0, BUFFER_SIZE);
        bytes_read = read(client_socket_fd, buffer, BUFFER_SIZE);
        if (bytes_read <= 0)
        {
            printf("Client disconnected.\n");
            break;
        }

        printf("Received: %s", buffer);
        // クライアントにデータを送り返す
        send(client_socket_fd, buffer, bytes_read, 0);
    }
    client_num--;
}

int main(int argc, char *argv[])
{
    int port;
    int new_socket_fd;
    struct sockaddr_in6 server_addr, client_addr;
    char buffer[BUFFER_SIZE];
    socklen_t addr_len = sizeof(client_addr);
    struct sigaction sa;

    sigemptyset(&sa.sa_mask);
    sa.sa_handler = handle_sigint;
    sa.sa_flags = 0;
    if (sigaction(SIGINT, &sa, NULL) == -1)
    {
        perror("sigaction");
        return 1;
    }

    // signal(SIGINT, handle_sigint);

    if (argc < 2)
    {
        printf("Usage: %s <port番号>\n", argv[0]);
        return 1;
    }
    port = atoi(argv[1]);

    // ソケットの作成
    socket_fd = socket(AF_INET6, SOCK_STREAM, 0);
    if (socket_fd < 0)
    {
        perror("Error creating socket");
        return EXIT_FAILURE;
    }

    // アドレス設定
    server_addr.sin6_family = AF_INET6;
    server_addr.sin6_addr = in6addr_any;
    server_addr.sin6_port = htons(port);

    // ソケットにアドレスをバインド
    if (bind(socket_fd, (struct sockaddr *)&server_addr, sizeof(server_addr)) < 0)
    {
        perror("Error binding socket");
        close(socket_fd);
        return EXIT_FAILURE;
    }

    // クライアントからの接続を待ち受け
    if (listen(socket_fd, 1) < 0)
    {
        perror("Error listening");
        close(socket_fd);
        return EXIT_FAILURE;
    }
    printf("Echo server is running on port %d...\n", port);

    while (server_running)
    {
        printf("Waiting for client...\n");
        new_socket_fd = accept(socket_fd, (struct sockaddr *)&client_addr, &addr_len);
        if (new_socket_fd < 0)
        {
            perror("Error accepting failed");
            continue;
        }
        printf("Client connected.\n");
        client_num++;

        // クライアントを処理するスレッドを作成
        pthread_t tid;
        int *client_socket_fd = malloc(sizeof(int));
        *client_socket_fd = new_socket_fd;
        pthread_create(&tid, NULL, handle_client, client_socket_fd);
        pthread_detach(tid);
    }

    // 新規のクライアント接続を停止
    printf("Prepare server server stop...\n");
    int weight_seconds = 10;
    while (client_num > 0 && weight_seconds > 0)
    {
        printf("Waiting for %d clients to disconnect...\n", client_num);
        sleep(1);
        weight_seconds--;
    }

    if (client_num > 0)
    {
        printf("Timeout. Force closing all clients...\n");
    }

    // ソケットを閉じる
    close(socket_fd);
}
